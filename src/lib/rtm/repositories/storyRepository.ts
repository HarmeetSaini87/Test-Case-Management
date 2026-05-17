import path from "path";
import { ensureValidJsonFile } from "../utils/integrity";
import { atomicWriteSync } from "../utils/atomicWrite";
import { UserStory, StoriesDatabase } from "../types/rtm";

const FILE_PATH = path.join(process.cwd(), "dataHub", "rtm", "stories.json");

export class StoryRepository {
  private static getDb(): StoriesDatabase {
    return ensureValidJsonFile<StoriesDatabase>(FILE_PATH, { schemaVersion: 1, stories: [] });
  }

  public static findAll(): UserStory[] {
    return this.getDb().stories;
  }

  public static findById(id: string): UserStory | undefined {
    return this.findAll().find(s => s.id === id);
  }

  public static findByProject(projectId: string): UserStory[] {
    return this.findAll().filter(s => s.projectId === projectId);
  }

  public static findByEpic(epicId: string): UserStory[] {
    return this.findAll().filter(s => s.epicId === epicId);
  }

  public static save(story: UserStory): UserStory {
    const db = this.getDb();
    const index = db.stories.findIndex(s => s.id === story.id);

    if (index >= 0) {
      // Optimistic Locking Check
      if (db.stories[index].version !== story.version) {
        throw new Error(`Concurrency Conflict: User Story ${story.key} has been modified by another process. Please reload and try again.`);
      }
      
      // Update
      story.version += 1;
      story.updatedAt = new Date().toISOString();
      db.stories[index] = story;
    } else {
      // Create
      story.version = 1;
      story.createdAt = new Date().toISOString();
      story.updatedAt = story.createdAt;
      db.stories.push(story);
    }

    atomicWriteSync(FILE_PATH, db);
    return story;
  }
}
