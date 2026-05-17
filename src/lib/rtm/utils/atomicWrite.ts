import fs from "fs";
import path from "path";

/**
 * Writes data to a temporary file and atomically renames it to the target path.
 * This prevents file corruption if the Node process crashes during the write operation.
 * Recommended for flat-file JSON databases.
 */
export function atomicWriteSync(targetPath: string, data: any): void {
  const dir = path.dirname(targetPath);
  const tempPath = `${targetPath}.tmp.${Date.now()}`;
  
  // Ensure the directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  try {
    // Write fully to the temporary file
    fs.writeFileSync(tempPath, fileContent, "utf-8");

    // Atomic rename (overwrites the target path safely)
    fs.renameSync(tempPath, targetPath);
  } catch (error) {
    // Clean up temp file on failure if it exists
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        console.error(`Failed to clean up temp file ${tempPath}`, cleanupError);
      }
    }
    throw error;
  }
}
