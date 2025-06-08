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
import { countTokensMiddleware } from "./middleware.js";

const manager = new TreeSitterManager();

/**
 * MCP Server Setup
 */
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

/**
 * Handler for listing available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolSchemas,
  };
});

/**
 * Handler for executing tools.
 */
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const handler = toolHandlers[request.params.name as keyof typeof toolHandlers];
  if (!handler) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  
  const result = await handler(manager, request);
  
  // Log the token count of the response
  countTokensMiddleware(request.params.name, result.content);
  
  return result;
});


/**
 * Starts the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TreeSitter MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
