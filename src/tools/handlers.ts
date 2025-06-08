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
      type: "text",
      text: `Successfully initialized Tree-sitter context and loaded grammars for: ${languages.join(', ')}.`
    }]
  };
};

const parseFile = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { language, path, content } = request.params.arguments as { language: string, path: string, content: string };
  if (!language || !path || content === undefined) {
    throw new Error("The 'language', 'path', and 'content' parameters are required.");
  }

  manager.parseFile(language, path, content);

  return {
    content: [{
      type: "text",
      text: `Successfully parsed and indexed file: ${path}`
    }]
  };
};

const structuralSearch = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path, query } = request.params.arguments as { path: string, query: string };
  if (!path || !query) {
    throw new Error("The 'path' and 'query' parameters are required.");
  }

  const results = manager.search(path, query);

  return {
    content: [{
      type: "json",
      json: results
    }]
  };
};

const listElements = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path, node_type } = request.params.arguments as { path: string, node_type: string };
  if (!path || !node_type) {
    throw new Error("The 'path' and 'node_type' parameters are required.");
  }

  const elements = manager.listElements(path, node_type);

  return {
    content: [{
      type: "json",
      json: elements
    }]
  };
};

const getContextualSnippet = async (manager: TreeSitterManager, request: CallToolRequest) => {
  const { path, row, column } = request.params.arguments as { path: string, row: number, column: number };
  if (!path || row === undefined || column === undefined) {
    throw new Error("The 'path', 'row', and 'column' parameters are required.");
  }

  const snippet = manager.getContextualSnippet(path, { row, column });

  return {
    content: [{
      type: "text",
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
