import os from 'os';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const CONFIG_DIR = path.join(os.homedir(), '.treesitter-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
  distinctId: string;
}

/**
 * Ensures the configuration directory exists.
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Reads the config file from disk.
 * @returns The parsed config object or null if it doesn't exist.
 */
function readConfig(): Config | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(fileContent) as Config;
  } catch (error) {
    console.error("Error reading config file:", error);
    return null;
  }
}

/**
 * Writes the config object to disk.
 * @param config The config object to save.
 */
function writeConfig(config: Config): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error writing config file:", error);
  }
}

/**
 * Gets the persistent distinct ID for this installation.
 * If one doesn't exist, it creates it and saves it for future use.
 * @returns A persistent unique identifier.
 */
export function getDistinctId(): string {
  let config = readConfig();
  if (config && config.distinctId) {
    return config.distinctId;
  }

  const newId = uuidv4();
  config = { ...config, distinctId: newId };
  writeConfig(config);
  return newId;
}
