import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolHandlers } from '../../src/tools/handlers.js';
import { TreeSitterManager } from '../../src/manager.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import path from 'path';

// Mock the TreeSitterManager
vi.mock('../../src/manager.js', () => {
  const TreeSitterManager = vi.fn();
  TreeSitterManager.prototype.initializeParser = vi.fn();
  TreeSitterManager.prototype.loadLanguage = vi.fn();
  TreeSitterManager.prototype.getOrParseTree = vi.fn();
  TreeSitterManager.prototype.search = vi.fn();
  TreeSitterManager.prototype.listElements = vi.fn();
  TreeSitterManager.prototype.getContextualSnippet = vi.fn();
  return { TreeSitterManager };
});

describe('Tool Handlers', () => {
  let manager: TreeSitterManager;

  beforeEach(() => {
    manager = new TreeSitterManager();
    vi.clearAllMocks();
  });

  describe('initialize_treesitter_context', () => {
    it('should handle successful initialization with a single language', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: { name: 'initialize_treesitter_context', arguments: { languages: ['typescript'] } },
      };
      await toolHandlers.initialize_treesitter_context(manager, request);
      expect(manager.initializeParser).toHaveBeenCalled();
      expect(manager.loadLanguage).toHaveBeenCalledWith('typescript');
    });

    it('should handle successful initialization with multiple languages', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: { name: 'initialize_treesitter_context', arguments: { languages: ['typescript', 'python'] } },
      };
      await toolHandlers.initialize_treesitter_context(manager, request);
      expect(manager.loadLanguage).toHaveBeenCalledWith('typescript');
      expect(manager.loadLanguage).toHaveBeenCalledWith('python');
    });

    it('should throw an error if languages parameter is missing', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: { name: 'initialize_treesitter_context', arguments: {} },
      };
      await expect(toolHandlers.initialize_treesitter_context(manager, request)).rejects.toThrow(
        "The 'languages' parameter must be an array of strings."
      );
    });

    it('should throw an error if languages parameter is not an array', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: { name: 'initialize_treesitter_context', arguments: { languages: 'typescript' } },
      };
      await expect(toolHandlers.initialize_treesitter_context(manager, request)).rejects.toThrow(
        "The 'languages' parameter must be an array of strings."
      );
    });

    it('should handle an empty languages array', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'initialize_treesitter_context', arguments: { languages: [] } },
        };
        await toolHandlers.initialize_treesitter_context(manager, request);
        expect(manager.initializeParser).toHaveBeenCalled();
        expect(manager.loadLanguage).not.toHaveBeenCalled();
    });
  });

  describe('structural_code_search', () => {
    it('should handle successful search', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'structural_code_search', arguments: { path: 'src/test.ts', query: '(call_expression)' } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        (manager.search as any).mockReturnValue([]);
        await toolHandlers.structural_code_search(manager, request);
        expect(manager.getOrParseTree).toHaveBeenCalledWith(expect.any(String));
        expect(manager.search).toHaveBeenCalled();
    });

    it('should return an empty array for no results', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'structural_code_search', arguments: { path: 'src/test.ts', query: '(non_existent_node)' } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        (manager.search as any).mockReturnValue([]);
        const result = await toolHandlers.structural_code_search(manager, request);
        expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it('should throw an error if path is missing', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'structural_code_search', arguments: { query: '(call_expression)' } },
        };
        await expect(toolHandlers.structural_code_search(manager, request)).rejects.toThrow(
            "The 'path' and 'query' parameters are required."
        );
    });

    it('should throw an error if query is missing', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'structural_code_search', arguments: { path: 'src/test.ts' } },
        };
        await expect(toolHandlers.structural_code_search(manager, request)).rejects.toThrow(
            "The 'path' and 'query' parameters are required."
        );
    });

    it('should propagate file not found errors', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'structural_code_search', arguments: { path: 'nonexistent.ts', query: 'q' } },
        };
        (manager.getOrParseTree as any).mockRejectedValue(new Error('File not found'));
        await expect(toolHandlers.structural_code_search(manager, request)).rejects.toThrow('File not found');
    });
  });

  describe('list_code_elements_by_kind', () => {
    it('should list elements successfully', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'list_code_elements_by_kind', arguments: { path: 'src/test.ts', node_type: 'function_declaration' } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        (manager.listElements as any).mockReturnValue([{ name: 'myFunction' }]);
        const result = await toolHandlers.list_code_elements_by_kind(manager, request);
        expect(manager.listElements).toHaveBeenCalled();
        expect(JSON.parse(result.content[0].text)).toEqual([{ name: 'myFunction' }]);
    });

    it('should return an empty array for no elements', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'list_code_elements_by_kind', arguments: { path: 'src/test.ts', node_type: 'non_existent' } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        (manager.listElements as any).mockReturnValue([]);
        const result = await toolHandlers.list_code_elements_by_kind(manager, request);
        expect(JSON.parse(result.content[0].text)).toEqual([]);
    });

    it('should throw an error if path is missing', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'list_code_elements_by_kind', arguments: { node_type: 'function_declaration' } },
        };
        await expect(toolHandlers.list_code_elements_by_kind(manager, request)).rejects.toThrow(
            "The 'path' and 'node_type' parameters are required."
        );
    });

    it('should throw an error if node_type is missing', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'list_code_elements_by_kind', arguments: { path: 'src/test.ts' } },
        };
        await expect(toolHandlers.list_code_elements_by_kind(manager, request)).rejects.toThrow(
            "The 'path' and 'node_type' parameters are required."
        );
    });

    it('should trigger filesystem fallback when content is not provided', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'list_code_elements_by_kind', arguments: { path: 'src/test.ts', node_type: 'function_declaration' } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        await toolHandlers.list_code_elements_by_kind(manager, request);
        expect(manager.getOrParseTree).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('get_contextual_code_snippets', () => {
    it('should get a snippet successfully', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'get_contextual_code_snippets', arguments: { path: 'src/test.ts', row: 1, column: 1 } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        (manager.getContextualSnippet as any).mockReturnValue('function myFunction() {}');
        const result = await toolHandlers.get_contextual_code_snippets(manager, request);
        expect(result.content[0].text).toBe('function myFunction() {}');
    });

    it('should handle no snippet found', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'get_contextual_code_snippets', arguments: { path: 'src/test.ts', row: 0, column: 0 } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        (manager.getContextualSnippet as any).mockReturnValue(null);
        const result = await toolHandlers.get_contextual_code_snippets(manager, request);
        expect(result.content[0].text).toContain('Could not find a contextual snippet');
    });

    it('should throw an error if path is missing', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'get_contextual_code_snippets', arguments: { row: 1, column: 1 } },
        };
        await expect(toolHandlers.get_contextual_code_snippets(manager, request)).rejects.toThrow(
            "The 'path', 'row', and 'column' parameters are required."
        );
    });

    it('should throw an error if row or column is missing', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'get_contextual_code_snippets', arguments: { path: 'src/test.ts' } },
        };
        await expect(toolHandlers.get_contextual_code_snippets(manager, request)).rejects.toThrow(
            "The 'path', 'row', and 'column' parameters are required."
        );
    });

    it('should trigger filesystem fallback when content is not provided', async () => {
        const request: CallToolRequest = {
            method: 'tools/call',
            params: { name: 'get_contextual_code_snippets', arguments: { path: 'src/test.ts', row: 1, column: 1 } },
        };
        (manager.getOrParseTree as any).mockResolvedValue({});
        await toolHandlers.get_contextual_code_snippets(manager, request);
        expect(manager.getOrParseTree).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
