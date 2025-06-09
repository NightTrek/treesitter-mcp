import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';

// Helper to send a JSON-RPC request
function sendRequest(proc: ChildProcess, method: string, params: any) {
  const request = {
    jsonrpc: '2.0',
    id: randomUUID(),
    method,
    params,
  };
  const str = JSON.stringify(request) + '\n';
  proc.stdin!.write(str);
}

// Helper to wait for a response
function waitForResponse(proc: ChildProcess): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (data: Buffer) => {
      buffer += data.toString();
      if (buffer.includes('\n')) {
        const message = buffer.slice(0, buffer.indexOf('\n'));
        buffer = buffer.slice(buffer.indexOf('\n') + 1);
        proc.stdout!.removeListener('data', onData);
        try {
          resolve(JSON.parse(message));
        } catch (e) {
          reject(e);
        }
      }
    };
    proc.stdout!.on('data', onData);
  });
}

describe('Integration Tests', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    serverProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'], // Use pipe for stderr
    });

    // Wait for the server to be ready
    await new Promise<void>((resolve) => {
      serverProcess.stderr!.on('data', (data) => {
        if (data.toString().includes('Server ready.')) {
          resolve();
        }
      });
    });
  }, 30000); // Increase hook timeout to 30s

  afterAll(() => {
    serverProcess.kill();
  });

  it('should initialize the context and perform a structural search', async () => {
    // 1. Initialize the context
    sendRequest(serverProcess, 'tools/call', {
      name: 'initialize_treesitter_context',
      arguments: { languages: ['typescript'] },
    });

    const initResponse = await waitForResponse(serverProcess);
    expect(initResponse.result.content[0].text).toContain('Successfully initialized');

    // 2. Perform a search
    const fixturePath = path.resolve(__dirname, 'fixtures', 'test-file.ts');
    sendRequest(serverProcess, 'tools/call', {
      name: 'structural_code_search',
      arguments: {
        path: fixturePath,
        query: '(variable_declarator name: (identifier) @var-name)',
      },
    });

    const searchResponse = await waitForResponse(serverProcess);
    const results = JSON.parse(searchResponse.result.content[0].text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('var-name');
  }, 30000); // Increase timeout for integration test
});
