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

const parseFile = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { language, path: relativePath } = request.params.arguments as { language: string, path: string };
  if (!language || !relativePath) {
    throw new Error("The 'language' and 'path' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  manager.parseFile(language, absolutePath, content);

  return {
    content: [{
      type: "text" as const,
      text: `Successfully parsed and indexed file: ${absolutePath}`
    }]
  };
};

const structuralSearch = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path: relativePath, query } = request.params.arguments as { path: string, query: string };
  if (!relativePath || !query) {
    throw new Error("The 'path' and 'query' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const results = manager.search(absolutePath, query);

  return {
    content: [{
      type: "json" as const,
      json: results
    }]
  };
};

const listElements = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path: relativePath, node_type } = request.params.arguments as { path: string, node_type: string };
  if (!relativePath || !node_type) {
    throw new Error("The 'path' and 'node_type' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const elements = manager.listElements(absolutePath, node_type);

  return {
    content: [{
      type: "json" as const,
      json: elements
    }]
  };
};

const getContextualSnippet = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path: relativePath, row, column } = request.params.arguments as { path: string, row: number, column: number };
  if (!relativePath || row === undefined || column === undefined) {
    throw new Error("The 'path', 'row', and 'column' parameters are required.");
  }

  const absolutePath = path.resolve(relativePath);
  const snippet = manager.getContextualSnippet(absolutePath, { row, column });

  return {
    content: [{
      type: "text" as const,
      text: snippet || "Could not find a contextual snippet for the given position."
    }]
  };
};

export const toolHandlers = {
  "initialize_treesitter_context": initializeContext,
  "parse_file": parseFile,
  "structural_code_search": structuralSearch,
  "list_code_elements_by_kind": listElements,
  "get_contextual_code_snippets": getContextualSnippet,
};
