import { Parser, Language, Tree, Query, Point, Node as TSNode } from "web-tree-sitter";
import path from "path";
import { fileURLToPath } from "url";
import { get_encoding } from "@dqbd/tiktoken";

// It's efficient to get the encoding once and reuse it.
const encoding = get_encoding("cl100k_base");

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manages the Tree-sitter parser, languages, and parsed syntax trees.
 * This class acts as the central state and logic hub for all Tree-sitter operations.
 */
export class TreeSitterManager {
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
   * Checks if a file has already been parsed and its tree is cached.
   * @param filePath The unique identifier for the file.
   * @returns True if the file is parsed, false otherwise.
   */
  isParsed(filePath: string): boolean {
    return this.trees.has(filePath);
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
      throw new Error(`File not found or not parsed: ${filePath}.`);
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

  /**
   * Lists all syntax nodes of a specific type in a parsed file.
   * @param filePath The unique identifier for the file.
   * @param nodeType The type of node to list (e.g., 'function_declaration').
   * @returns An array of found nodes with their details.
   */
  listElements(filePath: string, nodeType: string) {
    const tree = this.getTree(filePath);
    if (!tree) {
      throw new Error(`File not found or not parsed: ${filePath}.`);
    }

    const nodes = tree.rootNode.descendantsOfType(nodeType);

    return nodes.filter((node): node is TSNode => node !== null).map((node: TSNode) => {
      const nameNode = node.childForFieldName("name");
      return {
        name: nameNode ? nameNode.text : '(anonymous)',
        type: node.type,
        text: node.text,
        startPosition: node.startPosition,
        endPosition: node.endPosition,
      };
    });
  }

  /**
   * Gets a contextual snippet of code, typically the containing function or class.
   * @param filePath The unique identifier for the file.
   * @param position The row and column to find the context for.
   * @returns The text of the containing block, or null if not found.
   */
  getContextualSnippet(filePath: string, position: Point): string | null {
    const tree = this.getTree(filePath);
    if (!tree) {
      throw new Error(`File not found or not parsed: ${filePath}.`);
    }

    let node = tree.rootNode.descendantForPosition(position);
    if (!node) {
      return null;
    }

    // Walk up the tree to find a meaningful block-level parent
    const blockTypes = new Set([
      'function_declaration',
      'method_definition',
      'class_declaration',
      'arrow_function'
    ]);

    while (node.parent && !blockTypes.has(node.type)) {
      node = node.parent;
    }

    return node.text;
  }

}
