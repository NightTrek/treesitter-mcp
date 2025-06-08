export const toolSchemas = [
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
  },
  {
    name: "list_code_elements_by_kind",
    description: "Enumerates all code constructs of a given syntactic type in a file (e.g., all functions, classes, or imports). This provides a high-level 'table of contents' for a file, allowing for rapid understanding of its structure and key components.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The identifier of the file to analyze, which must have been parsed with `parse_file` first."
        },
        node_type: {
          type: "string",
          description: "The syntactic type of the elements to list (e.g., 'function_declaration', 'class_declaration')."
        }
      },
      required: ["path", "node_type"]
    },
    // Example of how this tool solves a problem
    // A developer is trying to understand a complex 1000-line file. Instead of reading it top-to-bottom,
    // they first want to see all the functions it contains.
    // Usage: list_code_elements_by_kind(path='src/utils.js', node_type='function_declaration')
    // This returns a clean list of all function names and their locations, providing an immediate structural overview.
  },
  {
    name: "get_contextual_code_snippets",
    description: "Extracts a contextual block of code (like a full function or class) based on a specific point in a file. This is ideal for understanding a feature without the noise of the entire file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The identifier of the file to analyze."
        },
        row: {
          type: "number",
          description: "The zero-based row number of the point of interest."
        },
        column: {
          type: "number",
          description: "The zero-based column number of the point of interest."
        }
      },
      required: ["path", "row", "column"]
    },
    // Example of how this tool solves a problem
    // A developer finds a function call `calculate_interest()` and wants to see its implementation.
    // They provide the location of the call.
    // Usage: get_contextual_code_snippets(path='src/finance.js', row: 105, column: 12)
    // The tool returns the full source code of the `calculate_interest` function, allowing for immediate review.
  }
];
