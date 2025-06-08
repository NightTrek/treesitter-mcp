# 🌳 Tree-sitter Code Search MCP Server

<p align="center">
  <img src="https://img.shields.io/badge/pnpm-v9.x-orange?logo=pnpm" alt="pnpm version">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript version">
  <img src="https://img.shields.io/badge/MCP-v0.6-green" alt="MCP version">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

A high-precision, multi-language code search and analysis server for AI agents and developers, built on the Model Context Protocol (MCP).

This server leverages the power of **Tree-sitter** to parse code into concrete syntax trees, enabling structural, syntax-aware queries that are impossible with traditional text-based search. This means zero false positives and a deep, semantic understanding of your codebase.

## 💡 Why Use This Server?

| Capability | Traditional Grep | Tree-sitter Server |
| :--- | :---: | :---: |
| **Accuracy** | Many False Positives | ✅ **Zero False Positives** |
| **Context-Awareness** | Low (text-based) | ✅ **High (syntactic)** |
| **Multi-line Patterns** | Fragile & Complex | ✅ **Trivial & Robust** |
| **Language Semantics** | None | ✅ **Understands `class` vs `func`** |

## ✨ Features

- 🧠 **Structural Search:** Find code patterns based on syntax, not just text.
- 🌐 **Multi-Language Support:** Ships with support for TypeScript, JavaScript, Python, Go, and Java out of the box.
- 🗺️ **High-Level Analysis:** Quickly list all functions, classes, or imports in a file to map out its structure.
- ✂️ **Contextual Snippets:** Surgically extract the full body of a function or class for focused analysis.
- 🏗️ **Clean & Modular:** Built with a clean architecture for easy extension and maintenance.
- 📊 **Token-Aware:** Includes middleware to count and log token usage for all tool responses.

## 🛠️ Available Tools

This server provides a powerful suite of tools for code analysis.

| Tool | Description | Primary Use Case |
| :--- | :--- | :--- |
| `initialize_treesitter_context` | Loads language grammars into memory. | **Must be called first.** Prepares the server for a session. |
| `parse_file` | Parses a file and caches its syntax tree. | **Required before analysis.** Makes a file's structure available. |
| `list_code_elements_by_kind` | Lists all nodes of a specific type (e.g., functions). | Get a high-level "table of contents" for a file. |
| `get_contextual_code_snippets`| Extracts the full containing block (function/class). | Zoom in on a specific feature's implementation. |
| `structural_code_search` | Executes a precise S-expression query. | Find specific, complex code patterns with no false positives. |

For detailed technical guidelines, see `.clinerules/treesitter-server-guidelines.md`.

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
> You have access to a powerful `treesitter-code-search` MCP server for code analysis. To use it effectively, you **must** follow this workflow:
>
> 1.  **Initialize:** Begin every session by calling `initialize_treesitter_context` with the languages in the project (e.g., `['typescript', 'python']`).
> 2.  **Parse:** For each file you need to analyze, you **must** call `parse_file` with the file's path and content. This is required before any other analysis can be done on that file.
> 3.  **Explore:** Use `list_code_elements_by_kind` to get a high-level overview of a file's structure (e.g., list all `'function_declaration'`).
> 4.  **Analyze:** Use `get_contextual_code_snippets` to view the full implementation of a specific function or class you've identified.
> 5.  **Search:** Use `structural_code_search` with a Tree-sitter query for precise, syntax-aware searches.
>
> Always prefer these structural analysis tools over simple text search for higher accuracy and zero false positives.

---

Happy coding!
