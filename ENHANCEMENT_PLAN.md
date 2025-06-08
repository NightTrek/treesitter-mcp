# Project Plan: Enhancing the Tree-sitter MCP Server for Advanced Code Analysis

## 1. Project Vision & Goals

**Vision:** To evolve the Tree-sitter MCP server from a set of foundational parsing tools into a sophisticated, agent-oriented code analysis engine. This enhanced server will empower Large Language Model (LLM) agents to navigate, understand, and modify complex codebases with high efficiency and precision.

**Core Goals:**

*   **Increase Efficiency:** Reduce redundant processing and minimize file access through caching and on-demand parsing.
*   **Enrich Context:** Provide LLMs with semantically complete, syntactically correct, and contextually relevant code snippets and structural information.
*   **Deepen Understanding:** Enable the server to answer higher-level questions about code relationships, such as symbol definitions, references, and local control flow.
*   **Improve Agent Autonomy:** Equip the LLM agent with a versatile toolkit that allows it to strategically explore codebases with minimal human intervention.

---

## 2. Phased Implementation Plan

This project is divided into three distinct phases. Each phase builds upon the last, delivering incremental value and progressively increasing the server's capabilities.

### **Phase 1: Foundational Tool Improvements**

This phase focuses on enhancing the existing tools to be more efficient and to provide more immediately useful, context-rich information to the LLM agent, addressing key recommendations from the research document.

#### **Task 1.1: Implement Session-Level Caching in `parse_file`**

*   **Objective:** Prevent re-parsing of the same file within a single agent session.
*   **Rationale:** As identified in the research, avoiding redundant file I/O and parsing is critical for interactive performance.

*   **Implementation Diagram:**
    ```mermaid
    sequenceDiagram
        participant Agent as LLM Agent
        participant Handler as parse_file Handler
        participant Manager as TreeSitterManager
        participant Cache as Map<string, Tree>
        participant FileSystem

        Agent->>Handler: parse_file(path: "/app/src/main.ts")
        Handler->>Manager: parseFile(path: "/app/src/main.ts")
        Manager->>Cache: has(path)?
        alt Cache Miss
            Cache-->>Manager: false
            Manager->>FileSystem: readFile(path)
            FileSystem-->>Manager: fileContent
            Manager->>Manager: parser.parse(fileContent)
            Manager->>Cache: set(path, newTree)
            Manager-->>Handler: { status: "Parsed from disk" }
        else Cache Hit
            Cache-->>Manager: true
            Manager-->>Handler: { status: "Parsed from cache" }
        end
        Handler-->>Agent: "Successfully parsed file..."
    ```

*   **Code Implementation (`src/manager.ts`):**
    ```typescript
    // In TreeSitterManager class
    private treeCache: Map<string, Parser.Tree> = new Map();

    public async parseFile(language: string, path: string, content: string): Promise<Parser.Tree> {
        if (this.treeCache.has(path)) {
            console.log(`Cache hit for: ${path}`);
            return this.treeCache.get(path)!;
        }

        console.log(`Cache miss. Parsing: ${path}`);
        const parser = new Parser();
        parser.setLanguage(this.languages.get(language));
        
        const tree = parser.parse(content);
        this.treeCache.set(path, tree);
        
        return tree;
    }

    // Optional: Tool to clear the cache if needed
    public clearCache(): void {
        this.treeCache.clear();
    }
    ```

*   **Acceptance Criteria:**
    *   Calling `parse_file` on the same path twice in a row results in the second call being served from the cache (verifiable through logging).
    *   All other tools that rely on a parsed tree continue to function correctly with cached trees.

---

#### **Task 1.2: Refine `get_contextual_code_snippets` for Semantic Completeness**

*   **Objective:** Ensure the tool extracts complete, logical code blocks and associated comments.
*   **Rationale:** LLMs require full, syntactically correct units of code for robust understanding. Incomplete fragments are often insufficient.

*   **Implementation Diagram:**
    ```mermaid
    graph TD
        A[Start: path, row, col] --> B{Find Node at Position};
        B --> C{Traverse Upwards (node.parent)};
        C --> D{Is node.type a 'Block' type?};
        D -- No --> C;
        D -- Yes --> E[Enclosing Block Found];
        E --> F{Option: include_comments?};
        F -- Yes --> G{Find Preceding Comment Nodes};
        G --> H[Prepend Comment Text];
        F -- No --> I[Extract Block Text];
        H --> I;
        I --> J[Return Full Snippet];

        subgraph Legend
            direction LR
            subgraph Block Types
                direction LR
                BT1[function_declaration]
                BT2[class_declaration]
                BT3[method_definition]
            end
        end
    ```

*   **Code Implementation (`src/manager.ts`):**
    ```typescript
    // In TreeSitterManager class
    private isBlockNodeType(nodeType: string): boolean {
        const blockTypes = [
            'function_declaration', 'class_declaration', 'method_definition',
            'if_statement', 'for_statement', 'while_statement', 'try_statement'
        ];
        return blockTypes.includes(nodeType);
    }

    public getContextualCodeSnippet(tree: Parser.Tree, row: number, column: number, includeComments: boolean): string {
        const rootNode = tree.rootNode;
        let node = rootNode.descendantForPosition({ row, column });

        if (!node) {
            return "Error: No node found at the specified position.";
        }

        // Traverse up to find the enclosing semantic block
        let enclosingBlock = node;
        while (enclosingBlock.parent && !this.isBlockNodeType(enclosingBlock.type)) {
            enclosingBlock = enclosingBlock.parent;
        }

        let snippet = enclosingBlock.text;

        if (includeComments) {
            let commentBlock = '';
            let sibling = enclosingBlock.previousSibling;
            while (sibling && sibling.type.includes('comment')) {
                commentBlock = sibling.text + '\n' + commentBlock;
                sibling = sibling.previousSibling;
            }
            snippet = commentBlock + snippet;
        }

        return snippet;
    }
    ```

*   **Acceptance Criteria:**
    *   Calling the tool with a cursor inside a function returns the entire function body, including its signature and braces.
    *   Calling with `include_comments: true` correctly includes the docstring or comment block immediately preceding the function/class.

---

#### **Task 1.3: Augment `structural_code_search` for Richer Output**

*   **Objective:** Make the tool's output more structured and directly usable, reducing the need for follow-up calls.
*   **Rationale:** A self-contained, detailed response from a search query makes the agent's logic simpler and more efficient.

*   **Data Structure Example (Output):**
    ```json
    [
      {
        "match_text": "function greet() { console.log('Hello'); }",
        "match_location": { "start": { "row": 5, "column": 0 }, "end": { "row": 7, "column": 1 } },
        "captures": {
          "name": {
            "text": "greet",
            "location": { "start": { "row": 5, "column": 9 }, "end": { "row": 5, "column": 14 } }
          },
          "body": {
            "text": "{ console.log('Hello'); }",
            "location": { "start": { "row": 5, "column": 17 }, "end": { "row": 7, "column": 1 } }
          }
        }
      }
    ]
    ```

*   **Code Implementation (`src/manager.ts`):**
    ```typescript
    // In TreeSitterManager class
    public structuralCodeSearch(tree: Parser.Tree, language: string, query: string): any[] {
        const lang = this.languages.get(language);
        if (!lang) throw new Error(`Language ${language} not initialized.`);

        const tsQuery = lang.query(query);
        const matches = tsQuery.matches(tree.rootNode);

        return matches.map(match => {
            const matchNode = match.pattern[match.pattern.length - 1].node;
            const captures = {};
            for (const capture of match.captures) {
                captures[capture.name] = {
                    text: capture.node.text,
                    location: {
                        start: capture.node.startPosition,
                        end: capture.node.endPosition
                    }
                };
            }
            return {
                match_text: matchNode.text,
                match_location: {
                    start: matchNode.startPosition,
                    end: matchNode.endPosition
                },
                captures: captures
            };
        });
    }
    ```

*   **Acceptance Criteria:**
    *   A query like `(function_declaration name: (identifier) @name body: (statement_block) @body)` returns a structured result containing a `captures` object with `name` and `body` keys.
    *   The text and location for each capture are accurate.

---

### **Phase 2: Core Intra-File Symbol Analysis**

This phase introduces new tools focused on establishing semantic relationships between code elements within a single file, providing a deeper level of understanding.

#### **Task 2.1: Create New Tool: `get_file_outline`**

*   **Objective:** Provide a structured, hierarchical summary of a file's principal components.
*   **Rationale:** Gives the agent a "table of contents" for a file, enabling more targeted and efficient exploration.

*   **Implementation Diagram:**
    ```mermaid
    graph TD
        A[Start: path] --> B{Parse File};
        B --> C{Query for Top-Level Nodes};
        C --> D[For each Class...];
        C --> E[For each Function...];
        C --> F[For each Import...];
        D --> G{Query for Methods/Properties inside Class};
        G --> H[Append to Class Node];
        H & E & F --> I{Assemble into Nested JSON};
        I --> J[Return Outline];
    ```

*   **Code Implementation (`src/manager.ts`):**
    ```typescript
    // In TreeSitterManager class
    public getFileOutline(tree: Parser.Tree, language: string): any {
        const outline = {
            imports: [],
            classes: [],
            functions: [],
        };

        const importQuery = this.languages.get(language)!.query(`(import_statement) @import`);
        outline.imports = importQuery.captures(tree.rootNode).map(c => c.node.text);

        const functionQuery = this.languages.get(language)!.query(`(function_declaration name: (identifier) @name)`);
        outline.functions = functionQuery.captures(tree.rootNode).map(c => c.node.text);

        const classQuery = this.languages.get(language)!.query(`(class_declaration name: (identifier) @name body: (class_body) @body)`);
        const classMatches = classQuery.matches(tree.rootNode);

        outline.classes = classMatches.map(match => {
            const classNode = match.captures.find(c => c.name === 'name')!.node;
            const bodyNode = match.captures.find(c => c.name === 'body')!.node;
            
            const methodQuery = this.languages.get(language)!.query(`(method_definition name: (property_identifier) @method_name)`);
            const methods = methodQuery.captures(bodyNode).map(c => c.node.text);

            return {
                name: classNode.text,
                methods: methods
            };
        });

        return outline;
    }
    ```

*   **Acceptance Criteria:**
    *   The tool returns a JSON object accurately representing the structure of a given source file, including classes with their methods.

---

### **Phase 3: Advanced and Cross-File Capabilities**

This phase tackles the most complex features, bridging the gap between single-file analysis and project-wide understanding.

#### **Task 3.1: Leverage `tags.scm` for Semantic Symbol Extraction**

*   **Objective:** Use the `queries/tags.scm` files from grammars for highly accurate, semantic symbol identification.
*   **Rationale:** `tags.scm` files contain expert-crafted queries that provide a more reliable and semantically rich way to list symbols than generic node-type queries.

*   **Implementation Diagram:**
    ```mermaid
    sequenceDiagram
        participant Agent
        participant Handler as get_semantic_symbols Handler
        participant Manager
        participant TagQueryCache

        Agent->>Handler: get_semantic_symbols(path)
        Handler->>Manager: getSemanticSymbols(path)
        Manager->>TagQueryCache: get(language)?
        alt Cache Miss
            TagQueryCache-->>Manager: null
            Manager->>Manager: locateAndLoadTagsFile()
            Manager->>TagQueryCache: set(language, tagsQuery)
        end
        Manager->>Manager: executeTagsQuery(tree)
        Manager-->>Handler: symbols
        Handler-->>Agent: Formatted Symbols
    ```

*   **Code Implementation (`src/manager.ts`):**
    ```typescript
    // In TreeSitterManager class
    private tagQueryCache: Map<string, Parser.Query> = new Map();

    private async loadTagsQuery(language: string): Promise<Parser.Query | null> {
        if (this.tagQueryCache.has(language)) {
            return this.tagQueryCache.get(language)!;
        }
        // NOTE: This requires a robust way to find the grammar's query files.
        // This might involve searching relative to the wasm path.
        // For now, this is a placeholder for that logic.
        const tagsFilePath = path.join(__dirname, `../wasm/queries/${language}/tags.scm`);
        try {
            const querySource = await fs.promises.readFile(tagsFilePath, 'utf8');
            const query = this.languages.get(language)!.query(querySource);
            this.tagQueryCache.set(language, query);
            return query;
        } catch (error) {
            console.error(`Could not load tags.scm for ${language}:`, error);
            return null;
        }
    }

    public async getSemanticSymbols(tree: Parser.Tree, language: string): Promise<any[]> {
        const tagsQuery = await this.loadTagsQuery(language);
        if (!tagsQuery) {
            return []; // Or fall back to a simpler method
        }

        const matches = tagsQuery.captures(tree.rootNode);
        // Process matches to extract symbol name, type (from capture name), and location
        // ...
        return []; // Placeholder for processed symbols
    }
    ```

*   **Acceptance Criteria:**
    *   The `get_semantic_symbols` tool returns a list of symbols for a file that is more accurate and detailed than the existing `list_code_elements_by_kind`.

This expanded plan provides a much more detailed guide for implementation.
