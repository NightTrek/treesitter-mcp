import { describe, it, expect, beforeEach } from 'vitest';
import { TreeSitterManager } from '../src/manager.js';

describe('TreeSitterManager', () => {
  let manager: TreeSitterManager;

  beforeEach(() => {
    manager = new TreeSitterManager();
  });

  it('should initialize the parser', async () => {
    await manager.initializeParser();
    expect(manager.getParser()).toBeDefined();
  });

  it('should load a language', async () => {
    await manager.initializeParser();
    await manager.loadLanguage('typescript');
    // No direct way to check loaded languages, but no error thrown is a good sign.
    // We'll implicitly test this in the parse test.
  });

  it('should parse a file from content', async () => {
    const filePath = '/virtual/test.ts';
    const content = 'const x: number = 1;';

    await manager.initializeParser();
    await manager.loadLanguage('typescript');
    
    manager.parseFile('typescript', filePath, content);
    
    const tree = manager.getTree(filePath);
    expect(tree).toBeDefined();
    expect(tree?.rootNode.text).toBe(content);
  });

  it('should search for nodes in a parsed tree', async () => {
    const filePath = '/virtual/test.ts';
    const content = 'function myFunction() {}';
    const query = '(function_declaration name: (identifier) @func-name)';

    await manager.initializeParser();
    await manager.loadLanguage('typescript');
    manager.parseFile('typescript', filePath, content);
    const tree = manager.getTree(filePath);

    const results = manager.search(tree!, query);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('func-name');
    expect(results[0].text).toBe('myFunction');
  });
});
