import fs from "fs";
import path from "path";

const DIR_PATH = path.join(process.cwd(), "dataHub", "testcases");

export class TestcaseRepository {
  /**
   * Retrieves all testcases from the flat-file directory.
   */
  public static findAll(): any[] {
    if (!fs.existsSync(DIR_PATH)) {
      return [];
    }

    const files = fs.readdirSync(DIR_PATH).filter(f => f.endsWith(".json"));
    return files
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(DIR_PATH, f), "utf-8"));
        } catch {
          console.error(`Failed to parse testcase file: ${f}`);
          return null;
        }
      })
      .filter(tc => tc !== null);
  }

  /**
   * Retrieves testcases scoped to a specific project.
   */
  public static findByProject(projectId: string): any[] {
    return this.findAll().filter(tc => tc.project === projectId);
  }
}
