## Brief overview
These are development guidelines for the Tree-sitter MCP server. The server is built with TypeScript and provides a suite of tools for structural code analysis. The architecture emphasizes separation of concerns to make adding new tools straightforward.

## Project Structure
- **`src/index.ts`**: The main server entry point. It is responsible for initializing the server, wiring up handlers, and managing the main event loop. It should rarely be modified unless changing core server behavior.
- **`src/manager.ts`**: Contains the `TreeSitterManager` class, which holds all state (parser, languages, syntax trees) and core logic for interacting with the Tree-sitter library. All tool functionality is implemented as methods on this class.
- **`src/tools/`**: This directory contains all tool-specific code.
  - **`schemas.ts`**: Defines the public-facing interface for all tools, including names, descriptions, and input schemas.
  - **`handlers.ts`**: Maps tool names to their implementation logic. It calls the appropriate methods on the `TreeSitterManager`.
- **`src/middleware.ts`**: Contains middleware functions that can inspect or act on tool requests and responses. Currently, it houses the token counting logic.
- **`wasm/`**: This directory stores the pre-compiled Tree-sitter language grammars (`.wasm` files). Each language requires its own grammar file here.

## Development Workflow
To add a new tool to the server, follow these steps:
1.  **Add Logic to Manager:** Implement the core functionality as a new public method on the `TreeSitterManager` class in `src/manager.ts`.
2.  **Define Schema:** Add a new tool definition object to the `toolSchemas` array in `src/tools/schemas.ts`. Provide a clear name, description, and input schema.
3.  **Create Handler:** Add a new handler function in `src/tools/handlers.ts`. This function will parse the arguments from the request and call the new method on the `TreeSitterManager`.
4.  **Register Handler:** Add the new handler function to the `toolHandlers` object in `src/tools/handlers.ts`, using the tool's name as the key.

## Middleware
- The token counting middleware in `src/middleware.ts` serves as an example of how to process tool results before they are sent to the client.
- It is integrated in `src/index.ts` by wrapping the call to the tool handler. This pattern can be extended to add other cross-cutting concerns like logging or validation.

## Server Usage Pattern
The intended workflow for a client using this server is as follows:
1.  Call `initialize_treesitter_context` once at the beginning of a session to load the required language grammars.
2.  For each file to be analyzed, call `parse_file` to generate and cache its syntax tree.
3.  Use `list_code_elements_by_kind` to get a high-level overview of a file's structure (e.g., list all functions).
4.  Use `structural_code_search` to run specific, detailed queries to find precise code patterns.
5.  Once an interesting code element is located, use `get_contextual_code_snippets` to retrieve its full surrounding context (like the entire function body) for detailed analysis.
