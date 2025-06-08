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
