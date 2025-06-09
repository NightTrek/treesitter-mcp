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
Gets a contextual snippet of code, typically the containing function or class. The file will be automatically parsed if it hasn't been already.

Why use this tool?
After finding a specific element (like a function call or declaration), you often need to see the full context in which it exists. This tool allows you to retrieve the entire body of the surrounding function, class, or other block-level element, providing a complete picture for analysis.

When to use it:
- To examine the implementation of a function you've located.
- To understand how a variable is used within its scope.
- To review the full definition of a class.

Example Scenario:
You've used 'list_code_elements_by_kind' to find that a file contains a function named 'calculatePrice'. Now you want to see the actual code of that function.

Correct Usage:
get_contextual_code_snippets({ path: '/path/to/src/logic.js', row: 42, column: 10 })

This will return the full text of the function or class that contains the code at the specified line and column.
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
          description: "The zero-based row number (line number) to start from."
        },
        column: {
          type: "number",
          description: "The zero-based column number to start from."
        }
      },
      required: ["path", "row", "column"]
    }
  }
];
