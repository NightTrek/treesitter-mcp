import { randomUUID } from 'crypto';

let distinctId: string | null = null;

/**
 * Returns a persistent, unique identifier for the current user or machine.
 * If not already generated, it creates a new UUID.
 *
 * @returns A unique string identifier.
 */
export function getDistinctId(): string {
  if (!distinctId) {
    // In a real-world scenario, you might generate this once and store it
    // in a configuration file to keep it consistent across sessions.
    distinctId = randomUUID();
  }
  return distinctId;
}
