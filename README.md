# 🌳 Tree-sitter Code Search MCP Server

A high-precision, multi-language code search and analysis server for AI agents and developers, built on the Model Context Protocol (MCP).

This server leverages the power of Tree-sitter to parse code into concrete syntax trees, enabling structural, syntax-aware queries that are impossible with traditional text-based search. This means zero false positives and a deep, semantic understanding of your codebase.

## ✨ Features

- **Structural Search:** Find code patterns based on syntax, not just text.
- **Multi-Language Support:** Ships with support for TypeScript, JavaScript, Python, Go, and Java out of the box.
- **High-Level Analysis:** Quickly list all functions, classes, or imports in a file.
- **Contextual Snippets:** Extract the full body of a function or class for focused analysis.
- **Clean & Modular:** Built with a clean architecture for easy extension and maintenance.
- **Token-Aware:** Includes middleware to count and log token usage for all tool responses.

## 🛠️ Available Tools

This server provides a suite of tools for code analysis:

- `initialize_treesitter_context`: Loads language grammars. **Must be called first.**
- `parse_file`: Parses a file and stores its syntax tree in memory.
- `structural_code_search`: Executes a Tree-sitter query on a parsed file.
- `list_code_elements_by_kind`: Lists all functions, classes, etc., in a file.
- `get_contextual_code_snippets`: Gets the full text of a containing function or class.

For detailed usage and examples, see the development guidelines in `.clinerules/treesitter-server-guidelines.md`.

## 🚀 Getting Started

### 1. Installation

Clone the repository and install the dependencies using `pnpm`.

```bash
git clone <repository-url>
cd tree-sitter-mcp
pnpm install
```

### 2. Build

Compile the TypeScript source code.

```bash
pnpm run build
```

The compiled output will be in the `build/` directory.

## ⚙️ Setup for Use

To use this server with an MCP client like Cline, you need to add it to your client's configuration file.

1.  **Locate your configuration file.** For Cline, this is typically found at:
    -   **macOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

2.  **Add the server configuration:** Open the JSON file and add the following entry to the `mcpServers` object. Make sure to replace `<path-to-this-project>` with the absolute path to this project's directory on your machine.

```json
{
  "mcpServers": {
    "... other servers": {},
    "treesitter-code-search": {
      "command": "node",
      "args": [
        "<path-to-this-project>/tree-sitter-mcp/build/index.js"
      ],
      "disabled": false,
      "autoApprove": [
        "initialize_treesitter_context",
        "parse_file",
        "structural_code_search",
        "list_code_elements_by_kind",
        "get_contextual_code_snippets"
      ]
    }
  }
}
```

3.  **Restart your MCP client.** The Tree-sitter server should now be available.

## 🤖 Prompt for AI Agents

To ensure a coding agent effectively uses this server for code analysis tasks, you can use a system prompt or initial instruction like this:

> **System Prompt:**
>
> You have access to a powerful `treesitter-code-search` MCP server for code analysis. To use it effectively, follow this workflow:
>
> 1.  **Initialize:** Begin by calling `initialize_treesitter_context` with the languages in the project (e.g., `['typescript', 'python']`).
> 2.  **Parse:** For each file you need to analyze, you **must** call `parse_file` with the file's path and content.
> 3.  **Explore:** Use `list_code_elements_by_kind` to get a high-level overview of a file's structure (e.g., list all `'function_declaration'`).
> 4.  **Analyze:** Use `get_contextual_code_snippets` to view the full implementation of a specific function or class you've identified.
> 5.  **Search:** Use `structural_code_search` with a Tree-sitter query for precise, syntax-aware searches.
>
> Always prefer these structural analysis tools over simple text search for higher accuracy.

---

Happy coding!
