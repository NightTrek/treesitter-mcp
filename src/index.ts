#!/usr/bin/env node

/**
 * TreeSitter MCP Server
 *
 * This server provides AI agents and engineers with high-precision, multi-language
 * code-search, navigation, and analysis tools by embedding the Tree-sitter parsing
 * stack inside an MCP (Model Context Protocol) plugin.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { TreeSitterManager } from "./manager.js";
import { toolSchemas } from "./tools/schemas.js";
import { toolHandlers } from "./tools/handlers.js";
import { logToolUsageMiddleware, ensureFileIsParsed } from "./middleware.js";
import { shutdownLogger } from "./logger.js";

export function createServer(manager: TreeSitterManager) {
  const server = new Server(
    {
      name: "TreeSitter Code Search",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolSchemas,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const handler = toolHandlers[request.params.name as keyof typeof toolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    // Wrap the handler with middleware
    const wrappedHandler = logToolUsageMiddleware(async (manager, request) => {
      await ensureFileIsParsed(manager, request);
      return handler(manager, request);
    });


    try {
      const result = await wrappedHandler(manager, request);
      return result;
    } catch (error: any) {
      throw error;
    }
  });

  return server;
}

async function main() {
  const manager = new TreeSitterManager();
  const server = createServer(manager);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TreeSitter MCP Server running on stdio");
  // Signal that the server is ready for integration tests.
  console.error("Server ready.");
}

main()
  .catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await shutdownLogger();
  });
