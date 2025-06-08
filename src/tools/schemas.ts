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

This command loads the necessary grammars, enabling you to then use 'parse_file' on both .py and .ts files.
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
    name: "parse_file",
    description: `
Parses a file's source code and stores its syntax tree in memory. This is a mandatory prerequisite for any structural analysis or search on a specific file. It converts raw text into a structured format that other tools can query.

Why use this tool?
After initializing the context, you must parse each file you intend to analyze. This tool is the bridge between seeing a file's text and understanding its structure. Use this tool to make a file's contents available for more advanced tools like 'structural_code_search' or 'list_code_elements_by_kind'. Every file must be parsed individually.

When to use it:
- After 'initialize_treesitter_context' and before any analysis of a specific file.
- When you need to analyze a file that has not been parsed yet in the current session.

Example Scenario:
An engineer asks you to analyze 'src/auth.py' for potential SQL injection vulnerabilities. After ensuring the 'python' language is loaded, you must parse this specific file.

Correct Usage:
parse_file({ language: 'python', path: '/path/to/src/auth.py' })

Response from tool:
"Successfully parsed and indexed file: /path/to/src/auth.py"

Now, the file is ready for a detailed 'structural_code_search' to find dangerous database queries.
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
          description: "The absolute path to the file. This is used to retrieve the parsed tree later."
        },
      },
      required: ["language", "path"]
    },
  },
  {
    name: "structural_code_search",
    description: `
Performs a precise, syntax-aware search on a *parsed* file using a Tree-sitter query. This is vastly superior to text-based search as it understands code structure and avoids false positives.

Why use this tool?
This is your most powerful tool for finding specific code patterns. When a user asks to find where a function is called, how a variable is used, or to identify a specific anti-pattern, this tool is the correct choice. It allows you to search for abstract concepts (e.g., "a function call") rather than just text. Remember, the file must be parsed first.

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
          description: "The absolute path of the file to search, which must have been parsed with `parse_file` first."
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
Enumerates all top-level code constructs of a specific type within a parsed file (e.g., all functions, classes, or imports). This provides a high-level 'table of contents' for a file, allowing for rapid understanding of its structure.

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
          description: "The absolute path of the file to analyze, which must have been parsed with `parse_file` first."
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
Extracts a complete, contextual block of code (like a full function or class body) based on a specific point (row, column) in a file.

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
          description: "The absolute path of the file to analyze."
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
  }
];
