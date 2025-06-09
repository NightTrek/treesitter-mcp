export const toolSchemas = [
  {
    name: "initialize_treesitter_context",
    description: `
Initializes the Tree-sitter parser and loads language grammars. This is the foundational step for all other code analysis tools and MUST be called once per session before any other tool in this server is used.

Why use this tool?
You should call this tool at the very beginning of any task that involves reading, understanding, or searching through code. It prepares the server to handle the specific programming languages in the user's project. Without this step, the server cannot parse files, and all other tools will fail.

When to use it:
- At the start of a new coding task.
- When the user wants to analyze code in a language that hasn't been loaded yet.

Example Scenario:
A user asks you to "find all deprecated function calls in a large codebase containing both Python and TypeScript files." Before you can even start looking at the files, you must prepare the server to understand both languages.

Correct Usage:
initialize_treesitter_context({ languages: ['python', 'typescript'] })

This command loads the necessary grammars, enabling you to then use other tools on both .py and .ts files.
    `,
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
  },
  {
    name: "structural_code_search",
    description: `
Performs a precise, syntax-aware search on a file using a Tree-sitter query. This is vastly superior to text-based search as it understands code structure and avoids false positives. The file will be automatically parsed if it hasn't been already.

Why use this tool?
This is your most powerful tool for finding specific code patterns. When a user asks to find where a function is called, how a variable is used, or to identify a specific anti-pattern, this tool is the correct choice. It allows you to search for abstract concepts (e.g., "a function call") rather than just text.

When to use it:
- To find all calls to a specific function.
- To locate all instances of a particular class being instantiated.
- To identify complex code patterns, like a 'try/except' block that is missing a 'finally' clause.

Example Scenario:
A developer needs to find all calls to a commonly named function 'execute()'. A simple text search for 'execute(' would return many false positives from comments, variable names, and strings. A structural search is needed for accuracy.

Correct Usage:
structural_code_search({
  path: '/path/to/src/api.js',
  query: '(call_expression function: (identifier) @func (#eq? @func "execute"))'
})

This query specifically finds nodes that are 'call_expression's where the function's identifier is exactly 'execute', yielding zero false positives and providing the exact location of each real call.
    `,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The absolute path of the file to search. This is a required parameter."
        },
        query: {
          type: "string",
          description: "The S-expression Tree-sitter query to execute."
        }
      },
      required: ["path", "query"]
    },
  },
  {
    name: "list_code_elements_by_kind",
    description: `
Enumerates all top-level code constructs of a specific type within a file (e.g., all functions, classes, or imports). This provides a high-level 'table of contents' for a file, allowing for rapid understanding of its structure. The file will be automatically parsed if it hasn't been already.

Why use this tool?
When you are faced with a large, unfamiliar file, reading it from top to bottom is inefficient. This tool gives you an immediate structural overview. It's perfect for getting your bearings, understanding the public API of a module, or quickly finding the major components of a file.

When to use it:
- As a first step when analyzing a new, complex file.
- When the user asks "what functions are in this file?" or "show me all the classes."
- To quickly find all API endpoints defined in a route file.

Example Scenario:
A developer is trying to understand a complex 1000-line 'utils.js' file. Instead of reading it all, they first want to see all the functions it contains to understand what utilities are available.

Correct Usage:
list_code_elements_by_kind({ path: '/path/to/src/utils.js', node_type: 'function_declaration' })

Response from tool:
[
  { "name": "formatDate", "start": { "row": 10, "column": 0 }, "end": { "row": 15, "column": 1 } },
  { "name": "calculateTax", "start": { "row": 20, "column": 0 }, "end": { "row": 45, "column": 1 } }
]

This provides a clean list of all function names and their locations, offering an instant map of the file's capabilities.
    `,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The absolute path of the file to analyze. This is a required parameter."
        },
        node_type: {
          type: "string",
          description: "The syntactic type of the elements to list (e.g., 'function_declaration', 'class_declaration')."
        }
      },
      required: ["path", "node_type"]
    },
  },
  {
    name: "get_contextual_code_snippets",
    description: `
Extracts a complete, contextual block of code (like a full function or class body) based on a specific point (row, column) in a file. The file will be automatically parsed if it hasn't been already.

Why use this tool?
After finding an interesting piece of code (e.g., via 'structural_code_search' or 'list_code_elements_by_kind'), you often need to see its full implementation. This tool lets you grab the entire surrounding context, such as the whole function body, without the noise of the rest of the file. It's essential for focused analysis.

When to use it:
- After finding a function call and wanting to see the function's definition.
- When you have the location of an error and want to see the code that caused it.
- To present a clean, focused snippet of code to the user for review.

Example Scenario:
Your 'structural_code_search' finds a call to 'calculate_interest()' at line 105. To understand what that function does, you need to see its source code.

Correct Usage:
get_contextual_code_snippets({ path: '/path/to/src/finance.js', row: 105, column: 12 })

Response from tool:
"function calculate_interest(principal, rate, time) {\\n  // ... implementation details ...\\n  return principal * rate * time;\\n}"

This returns the full, clean source code of the relevant function, allowing for immediate and focused review.
    `,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The absolute path of the file to analyze. This is a required parameter."
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
  },
  {
    name: "validate_syntax_token_counts",
    description: `
Analyzes a source file to compare token counts between the original code, its Concrete Syntax Tree (CST), and a generated Abstract Syntax Tree (AST). The file will be automatically parsed if it hasn't been already.

Why use this tool?
This tool is designed to validate the assumption that an AST can provide a more token-efficient representation of code while preserving its structural and semantic meaning. It returns the token counts for all three representations and also provides the full CST and the summarized AST in JSON format. This is useful for developing strategies to create context for LLMs that is both concise and informative.

When to use it:
- When you want to analyze the token density of a file.
- To get a structured, high-level overview of a file's architecture (the AST).
- To develop and test different AST generation strategies for token optimization.

Example Scenario:
An engineer wants to build a RAG system for a large codebase. To provide context to the LLM, they need a way to represent files that is smaller than the original source but still contains the key information. They use this tool to analyze a file, see the token reduction from the AST, and inspect the AST to see if it captures the necessary structural information (imports, functions, classes, etc.).

Correct Usage:
// Then, run the analysis
validate_syntax_token_counts({ language: 'typescript', path: 'src/utils.ts' })

Response from tool:
A JSON object containing:
- originalTokenCount: number
- cstTokenCount: number
- astTokenCount: number
- cst: object (The full Concrete Syntax Tree)
- ast: object (The summarized Abstract Syntax Tree)
    `,
    inputSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "The programming language of the file. Must be one of the languages loaded during initialization."
        },
        path: {
          type: "string",
          description: "The absolute path to the file to analyze. This is a required parameter."
        },
      },
      required: ["language", "path"]
    },
  }
];
