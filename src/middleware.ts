import { get_encoding } from "@dqbd/tiktoken";

// Define the type for the content array in a tool result, as it's not directly exported.
type ToolResultContent = (
  | { type: 'text', text?: string }
  | { type: 'json', json?: any }
  | { type: 'error', error: any }
)[];


// It's efficient to get the encoding once and reuse it.
// "cl100k_base" is the encoding used by gpt-4, gpt-3.5-turbo, and text-embedding-ada-002.
const encoding = get_encoding("cl100k_base");

/**
 * A middleware function that inspects a tool's result, counts the tokens
 * in its content, and logs the count.
 *
 * @param toolName The name of the tool that was executed.
 * @param content The content array from the tool's result.
 */
export function countTokensMiddleware(toolName: string, content: ToolResultContent | undefined): void {
  if (!content) {
    return;
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

  console.error(`[Token Counter] Tool '${toolName}' response contains ${totalTokens} tokens.`);

  // The encoding object should be freed when it's no longer needed to avoid memory leaks.
  // For a long-running server, we might manage this differently, but for now,
  // we assume the server process will handle cleanup on exit.
  // encoding.free(); // This would be used if we weren't reusing the encoding object.
}
