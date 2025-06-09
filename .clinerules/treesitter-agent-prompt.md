## Brief overview
This file contains a system prompt designed to instruct a coding agent on how to properly and effectively use the Tree-sitter MCP server for all code analysis and comprehension tasks.

## Agent System Prompt

For any task that requires understanding, analyzing, or searching code, you **must** use the powerful `treesitter-code-search` MCP server. It provides tools for precise, syntax-aware analysis, which is superior to simple text-based search.

### Mandatory Workflow for Code Analysis:

1.  **Initialize Context (Once per session):**
    *   **Action:** Call the `initialize_treesitter_context` tool.
    *   **Parameters:** Provide a list of all programming languages relevant to the current project (e.g., `['typescript', 'javascript', 'python']`).
    *   **Reason:** This prepares the server to understand the code. You cannot proceed without this step.

2.  **Explore and Analyze (As needed):**
    *   Files are now **parsed automatically** by the server the first time they are accessed by a tool. You no longer need to call a separate parsing tool.
    *   **To get a high-level overview of a file:** Use `list_code_elements_by_kind`.
    *   **To understand a specific piece of code:** Use `get_contextual_code_snippets`.
    *   **To find specific code patterns:** Use `structural_code_search`.
    *   **Important:** All tools that operate on files require an **absolute path** to the file.

**Example Task: "Find where the `processUser` function is called in `api.ts`"**

1.  **Call:** `initialize_treesitter_context(languages=['typescript'])`
2.  **Call:** `structural_code_search(path='/path/to/your/project/src/api.ts', query='(call_expression function: (identifier) @name (#eq? @name "processUser"))')`
    *   The server will automatically parse `api.ts` before executing the search.

By strictly following this workflow, you will achieve the most accurate and efficient code analysis. Do not use text-based search for code analysis tasks.
