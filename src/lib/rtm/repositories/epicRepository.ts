import path from "path";
import { ensureValidJsonFile } from "../utils/integrity";
import { atomicWriteSync } from "../utils/atomicWrite";
import { Epic, EpicsDatabase } from "../types/rtm";

const FILE_PATH = path.join(process.cwd(), "dataHub", "rtm", "epics.json");

export class EpicRepository {
  private static getDb(): EpicsDatabase {
    return ensureValidJsonFile<EpicsDatabase>(FILE_PATH, { schemaVersion: 1, epics: [] });
  }

  public static findAll(): Epic[] {
    return this.getDb().epics;
  }

  public static findById(id: string): Epic | undefined {
    return this.findAll().find(e => e.id === id);
  }

  public static findByProject(projectId: string): Epic[] {
    return this.findAll().filter(e => e.projectId === projectId);
  }

  public static save(epic: Epic): Epic {
    const db = this.getDb();
    const index = db.epics.findIndex(e => e.id === epic.id);

    if (index >= 0) {
      // Optimistic Locking Check
      if (db.epics[index].version !== epic.version) {
        throw new Error(`Concurrency Conflict: Epic ${epic.key} has been modified by another process. Please reload and try again.`);
      }
      
      // Update
      epic.version += 1;
      epic.updatedAt = new Date().toISOString();
      db.epics[index] = epic;
    } else {
      // Create
      epic.version = 1;
      epic.createdAt = new Date().toISOString();
      epic.updatedAt = epic.createdAt;
      db.epics.push(epic);
    }

    atomicWriteSync(FILE_PATH, db);
    return epic;
  }
}
