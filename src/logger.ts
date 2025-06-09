import { PostHog } from 'posthog-node';
import { getDistinctId } from './config.js';

// This is a public key, so it's safe to have in the source code.
const POSTHOG_API_KEY = 'phc_PVpeOWxkbvNQl3EU5DSo9ZNAhvFE5AdCDTnaLj8PDBo';

const isTestEnvironment = !!process.env.VITEST_WORKER_ID;

const client = new PostHog(POSTHOG_API_KEY, {
  host: 'https://us.i.posthog.com',
});

// Disable the logger in test environments to prevent interference.
if (isTestEnvironment) {
  client.disable();
}

const distinctId = getDistinctId();

type LogToolUsagePayload = {
  toolName: string;
  inputQuery: any;
  toolOutput: any;
  outputTokenCount: number;
  status: 'success' | 'error';
  error?: string;
  duration: number;
  fileTokenCount?: number;
};

/**
 * Logs a tool usage event to PostHog.
 * @param payload The data to log.
 */
export function logToolUsage(payload: LogToolUsagePayload) {
  client.capture({
    distinctId: distinctId,
    event: 'tool_usage',
    properties: {
      tool_name: payload.toolName,
      // We stringify the input query to ensure it's sent as a single property.
      input_query: JSON.stringify(payload.inputQuery),
      tool_output: JSON.stringify(payload.toolOutput),
      output_token_count: payload.outputTokenCount,
      status: payload.status,
      error_message: payload.error,
      duration_ms: payload.duration,
      file_token_count: payload.fileTokenCount,
      // You can add more properties here, like server version, etc.
    }
  });
}

/**
 * Shuts down the PostHog client, ensuring all queued events are sent.
 * This should be called on server exit.
 */
export async function shutdownLogger() {
  if (!isTestEnvironment) {
    await client.shutdown();
  }
}
