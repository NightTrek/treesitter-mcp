import { promises as fs } from 'fs';
import path from 'path';
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { TreeSitterManager } from "../manager.js";

const initializeContext = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const languages = request.params.arguments?.languages as string[];
  if (!languages || !Array.isArray(languages)) {
    throw new Error("The 'languages' parameter must be an array of strings.");
  }

  await manager.initializeParser();
  const loadPromises = languages.map(lang => manager.loadLanguage(lang));
  await Promise.all(loadPromises);

  return {
    content: [{
      type: "text" as const,
      text: `Successfully initialized Tree-sitter context and loaded grammars for: ${languages.join(', ')}.`
    }]
  };
};


const structuralSearch = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path: relativePath, query } = request.params.arguments as { path: string, query: string };
  if (!relativePath || !query) {
    throw new Error("The 'path' and 'query' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const tree = await manager.getOrParseTree(absolutePath);
  const results = manager.search(tree, query);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(results, null, 2)
    }]
  };
};

const listElements = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path: relativePath, node_type } = request.params.arguments as { path: string, node_type: string };
  if (!relativePath || !node_type) {
    throw new Error("The 'path' and 'node_type' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const tree = await manager.getOrParseTree(absolutePath);
  const elements = manager.listElements(tree, node_type);

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(elements, null, 2)
    }]
  };
};

const getContextualSnippet = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path: relativePath, row, column } = request.params.arguments as { path: string, row: number, column: number };
  if (!relativePath || row === undefined || column === undefined) {
    throw new Error("The 'path', 'row', and 'column' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const tree = await manager.getOrParseTree(absolutePath);
  const snippet = manager.getContextualSnippet(tree, { row, column });

  return {
    content: [{
      type: "text" as const,
      text: snippet || "Could not find a contextual snippet for the given position."
    }]
  };
};

export const toolHandlers = {
  "initialize_treesitter_context": initializeContext,
  "structural_code_search": structuralSearch,
  "list_code_elements_by_kind": listElements,
  "get_contextual_code_snippets": getContextualSnippet,
};
