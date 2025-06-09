import { Parser, Language, Tree, Query, Point, Node as TSNode } from "web-tree-sitter";
import path from "path";
import { promises as fs } from "fs";
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
   * Retrieves a syntax tree for a file, parsing it if it hasn't been already.
   * This is the central method for accessing file trees. It can either use
   * provided content or read from the filesystem.
   * @param filePath The absolute path to the file, used as a unique identifier.
   * @param languageName The language of the file. If not provided, it will be inferred.
   * @param content Optional file content. If not provided, it will be read from disk.
   * @returns The parsed Tree.
   */
  async getOrParseTree(filePath: string, languageName?: string, content?: string): Promise<Tree> {
    if (this.trees.has(filePath)) {
      return this.trees.get(filePath)!;
    }

    const lang = languageName || this.inferLanguage(filePath);
    if (!this.languages.has(lang)) {
      await this.loadLanguage(lang);
    }

    let fileContent = content;
    if (fileContent === undefined) {
      try {
        await fs.access(filePath);
        fileContent = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        throw new Error(`File not found at path: ${filePath}. Please ensure you are using an absolute path to the file.`);
      }
    }
    
    this.parseFile(lang, filePath, fileContent);
    return this.trees.get(filePath)!;
  }

  /**
   * Infers the programming language from a file extension.
   * @param filePath The path to the file.
   * @returns The inferred language name.
   */
  private inferLanguage(filePath: string): string {
    const extension = path.extname(filePath).slice(1);
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'java':
        return 'java';
      default:
        throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  /**
   * Executes a Tree-sitter query against a parsed file.
   * @param tree The syntax tree to search.
   * @param queryString The S-expression query to execute.
   * @returns An array of captures.
   */
  search(tree: Tree, queryString: string) {

    const language = tree.language;
    const query = new Query(language, queryString);
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
   * @param tree The syntax tree to analyze.
   * @param nodeType The type of node to list (e.g., 'function_declaration').
   * @returns An array of found nodes with their details.
   */
  listElements(tree: Tree, nodeType: string) {

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
   * @param tree The syntax tree to analyze.
   * @param position The row and column to find the context for.
   * @returns The text of the containing block, or null if not found.
   */
  getContextualSnippet(tree: Tree, position: Point): string | null {

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
