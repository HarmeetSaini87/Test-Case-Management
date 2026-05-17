import fs from "fs";
import { atomicWriteSync } from "./atomicWrite";

/**
 * Ensures a JSON file exists and contains valid JSON.
 * If the file is missing or corrupted, it auto-repairs it by writing the fallback data.
 */
export function ensureValidJsonFile<T>(filePath: string, fallbackData: T): T {
  if (!fs.existsSync(filePath)) {
    console.warn(`[RTM Integrity] File missing at ${filePath}. Creating new with fallback data.`);
    atomicWriteSync(filePath, fallbackData);
    return fallbackData;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[RTM Integrity] Corruption detected at ${filePath}. Auto-repairing with fallback.`);
    atomicWriteSync(filePath, fallbackData);
    return fallbackData;
  }
}
