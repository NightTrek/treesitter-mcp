#!/usr/bin/env node

/**
 * TreeSitter MCP Server
 *
 * This server provides AI agents and engineers with high-precision, multi-language
 * code-search, navigation, and analysis tools by embedding the Tree-sitter parsing
 * stack inside an MCP (Model Context Protocol) plugin.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { Parser, Language, Tree, Query } from "web-tree-sitter";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manages the Tree-sitter parser, languages, and parsed syntax trees.
 * This class acts as the central state and logic hub for all Tree-sitter operations.
 */
class TreeSitterManager {
  private parser: Parser | null = null;
  private languages: Map<string, Language> = new Map();
  private trees: Map<string, Tree> = new Map();

  /**
   * Initializes the Tree-sitter parser. This must be called before any
   * other operations can be performed.
   */
  async initializeParser(): Promise<void> {
    if (this.parser) return;
    await Parser.init();
    this.parser = new Parser();
  }

  /**
   * Loads a language grammar from its WASM file.
   * @param languageName The name of the language (e.g., "typescript", "python").
   * @returns A promise that resolves when the language is loaded.
   */
  async loadLanguage(languageName: string): Promise<void> {
    if (this.languages.has(languageName)) {
      console.log(`Language '${languageName}' is already loaded.`);
      return;
    }

    // Construct the path to the WASM file.
    // Assumes wasm files are located at ../wasm/*.wasm relative to the build output.
    const wasmPath = path.join(__dirname, "..", "wasm", `tree-sitter-${languageName}.wasm`);
    
    try {
      const language = await Language.load(wasmPath);
      this.languages.set(languageName, language);
      console.log(`Successfully loaded language: ${languageName}`);
    } catch (error) {
      console.error(`Failed to load language '${languageName}' from ${wasmPath}`, error);
      throw new Error(`Could not load grammar for '${languageName}'. Ensure the WASM file exists at the expected path.`);
    }
  }

  /**
   * Ensures the parser is initialized before use.
   * @returns The initialized Parser instance.
   */
  getParser(): Parser {
    if (!this.parser) {
      throw new Error("Parser not initialized. Call initialize_treesitter_context first.");
    }
    return this.parser;
  }

  /**
   * Parses a source code file and stores its syntax tree.
   * @param languageName The language of the file.
   * @param filePath A unique identifier for the file (e.g., its path).
   * @param content The source code content.
   */
  parseFile(languageName: string, filePath: string, content: string): void {
    const parser = this.getParser();
    const language = this.languages.get(languageName);
    if (!language) {
      throw new Error(`Language '${languageName}' is not loaded. Call initialize_treesitter_context first.`);
    }

    parser.setLanguage(language);
    const tree = parser.parse(content);
    if (!tree) {
      throw new Error(`Failed to parse file: ${filePath}. The parser returned null.`);
    }
    this.trees.set(filePath, tree);
  }

  /**
   * Retrieves a parsed syntax tree for a given file.
   * @param filePath The unique identifier for the file.
   * @returns The parsed Tree, or undefined if not found.
   */
  getTree(filePath: string): Tree | undefined {
    return this.trees.get(filePath);
  }

  /**
   * Executes a Tree-sitter query against a parsed file.
   * @param filePath The unique identifier for the file to search.
   * @param queryString The S-expression query to execute.
   * @returns An array of captures.
   */
  search(filePath: string, queryString: string) {
    const tree = this.getTree(filePath);
    if (!tree) {
      throw new Error(`File not found or not parsed: ${filePath}. Use parse_file first.`);
    }

    const language = tree.language;
    const query = language.query(queryString);
    const matches = query.captures(tree.rootNode);

    return matches.map(match => ({
      name: match.name,
      text: match.node.text,
      startPosition: match.node.startPosition,
      endPosition: match.node.endPosition,
    }));
  }
}

const manager = new TreeSitterManager();

/**
 * MCP Server Setup
 */
const server = new Server(
  {
    name: "TreeSitter Code Search",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler for listing available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "initialize_treesitter_context",
        description: "Initializes the Tree-sitter parser and loads language grammars. This is the foundational step for all other code analysis tools. It prepares the environment by loading the parsers for the specified languages, enabling structural and semantic understanding of code files.",
        inputSchema: {
          type: "object",
          properties: {
            languages: {
              type: "array",
              items: {
                type: "string",
                enum: ["typescript", "javascript", "python", "go", "java"],
              },
              description: "A list of programming languages to prepare for parsing. The server will load the corresponding grammar for each language."
            }
          },
          required: ["languages"]
        },
        // Example of how this tool solves a problem
        // A developer wants to find all deprecated function calls in a large polyglot codebase.
        // Before they can run a structural search, they must first initialize the context for
        // all relevant languages (e.g., Python and TypeScript).
        // Usage: initialize_treesitter_context(languages=['python', 'typescript'])
        // This prepares the server to understand and query both Python and TypeScript files.
      },
      {
        name: "parse_file",
        description: "Parses a file's source code using a specific language grammar and stores the resulting syntax tree in memory. This is a necessary step before performing structural searches or analysis on a file. It converts the text into a structured format that the other tools can understand.",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "The programming language of the file. Must be one of the languages loaded during initialization."
            },
            path: {
              type: "string",
              description: "A unique identifier for the file, typically its file path. This is used to retrieve the parsed tree later."
            },
            content: {
              type: "string",
              description: "The full source code content of the file."
            }
          },
          required: ["language", "path", "content"]
        },
        // Example of how this tool solves a problem
        // An engineer needs to analyze a specific file, `auth.py`, for security vulnerabilities.
        // Before running a query to find SQL injection patterns, they must first parse the file.
        // Usage: parse_file(language='python', path='src/auth.py', content='...')
        // This makes the file's structure available for the `structural_code_search` tool.
      },
      {
        name: "structural_code_search",
        description: "Performs a structural search on a parsed file using a Tree-sitter query. This allows for precise, syntax-aware code searching that is impossible with text-based search. It finds patterns based on the code's structure, not just its text.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The identifier of the file to search, which must have been parsed with `parse_file` first."
            },
            query: {
              type: "string",
              description: "The S-expression Tree-sitter query to execute."
            }
          },
          required: ["path", "query"]
        },
        // Example of how this tool solves a problem
        // A developer needs to find all function calls to a specific, but commonly named, function `execute()`.
        // A text search for `execute(` would return many false positives from comments and variable names.
        // Usage: structural_code_search(path='src/api.js', query='(call_expression function: (identifier) @func (#eq? @func \\"execute\\"))')
        // This query specifically finds nodes that are `call_expression`s where the function's name is exactly `execute`, yielding zero false positives.
      }
    ]
  };
});

/**
 * Handler for executing tools.
 */
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  switch (request.params.name) {
    case "initialize_treesitter_context": {
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
    }

    case "parse_file": {
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
    }

    case "structural_code_search": {
      const { path: searchPath, query } = request.params.arguments as { path: string, query: string };
      if (!searchPath || !query) {
        throw new Error("The 'path' and 'query' parameters are required.");
      }

      const results = manager.search(searchPath, query);

      return {
        content: [{
          type: "json",
          json: results
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});


/**
 * Starts the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TreeSitter MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
