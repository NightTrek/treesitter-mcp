import { get_encoding } from "@dqbd/tiktoken";

// Define the type for the content array in a tool result, as it's not directly exported.
type ToolResultContent = (
  | { type: 'text', text?: string }
  | { type: 'json', json?: any }
  | { type: 'error', error: any }
)[];

// It's efficient to get the encoding once and reuse it.
const encoding = get_encoding("cl100k_base");

/**
 * Counts the tokens in a tool's result content.
 *
 * @param content The content array from the tool's result.
 * @returns The total number of tokens in the content.
 */
export function countTokens(content: ToolResultContent | undefined): number {
  if (!content) {
    return 0;
  }

  let totalTokens = 0;

  for (const part of content) {
    let textToEncode = "";
    if (part.type === 'text' && part.text) {
      textToEncode = part.text;
    } else if (part.type === 'json' && part.json) {
      textToEncode = JSON.stringify(part.json);
    }

    if (textToEncode) {
      totalTokens += encoding.encode(textToEncode).length;
    }
  }

  return totalTokens;
}
import { TreeSitterManager } from './manager.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

const languageMap: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
};

/**
 * Middleware to ensure a file is parsed before a tool handler is executed.
 * If the file is not already parsed, it reads the file, determines the language,
 * and calls the manager to parse it.
 *
 * @param manager The TreeSitterManager instance.
 * @param request The tool request, which must contain a 'path' argument.
 */
export async function ensureFileIsParsed(manager: TreeSitterManager, request: CallToolRequest): Promise<void> {
  const relativePath = request.params.arguments?.path as string;
  if (!relativePath) {
    return;
  }
  const filePath = path.resolve(relativePath);

  // If there's no file path or the file is already parsed, do nothing.
  if (manager.isParsed(filePath)) {
    return;
  }

  // Determine the language from the file extension.
  const extension = path.extname(filePath);
  const language = languageMap[extension];
  if (!language) {
    // If the language is not supported, we don't try to parse it.
    // The tool itself will likely fail, but that's the correct behavior.
    console.warn(`Unsupported file type for auto-parsing: ${extension}`);
    return;
  }

  try {
    // Read the file content from disk.
    const content = await fs.readFile(filePath, 'utf-8');
    // Parse the file and cache the tree.
    manager.parseFile(language, filePath, content);
    console.log(`Auto-parsed file: ${filePath}`);
  } catch (error: any) {
    // If the file can't be read, we log it but don't block the tool.
    // The tool itself will then fail with a more specific "file not found" error.
    console.error(`Auto-parsing failed for ${filePath}:`, error.message);
  }
}
