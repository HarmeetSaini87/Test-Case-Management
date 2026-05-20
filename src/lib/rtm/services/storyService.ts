import { StoryRepository } from "../repositories/storyRepository";
import { CacheService } from "./cacheService";
import { ValidationService } from "./validationService";
import { normalizeKey } from "../utils/normalization";
import { UserStory, RequirementStatus } from "../types/rtm";

export class StoryService {
  /**
   * Creates or updates a User Story, enforcing normalization, referential validation, and uniqueness.
   */
  public static createOrUpdate(storyData: Partial<UserStory>): UserStory {
    if (!storyData.projectId || !storyData.epicId || !storyData.key || !storyData.title) {
      throw new Error("Missing required Story fields (projectId, epicId, key, title).");
    }

    const normalizedKey = normalizeKey(storyData.key);
    if (!ValidationService.isValidKeyFormat(normalizedKey)) {
      throw new Error(`Invalid Story key format: ${storyData.key}. Expected format like "US-123".`);
    }

    // Referential Integrity Check
    if (!ValidationService.validateEpicExists(storyData.epicId)) {
      throw new Error(`Referential Integrity Error: Epic ID ${storyData.epicId} does not exist in the catalog.`);
    }

    // Duplicate prevention check (on Create)
    if (!storyData.id) {
      const existing = StoryRepository.findByProject(storyData.projectId).find(s => s.key === normalizedKey);
      if (existing) {
        throw new Error(`Story with key ${normalizedKey} already exists in project ${storyData.projectId}.`);
      }
    }

    const story: UserStory = {
      id: storyData.id || `rtm-us-${Date.now()}`,
      projectId: storyData.projectId,
      epicId: storyData.epicId,
      key: normalizedKey,
      title: storyData.title,
      status: storyData.status || RequirementStatus.ACTIVE,
      version: storyData.version || 0,
      createdAt: storyData.createdAt || new Date().toISOString(),
      updatedAt: storyData.updatedAt || new Date().toISOString(),
      external: storyData.external,
      coverage: storyData.coverage
    };

    const saved = StoryRepository.save(story);
    
    // Invalidate cache on write
    CacheService.invalidate();
    return saved;
  }

  /**
   * Soft deletes a User Story. 
   * It is safe to archive a story that has active test cases, as historical snapshots will remain.
   */
  public static archive(storyId: string): void {
    const story = StoryRepository.findById(storyId);
    if (!story) throw new Error("User Story not found.");

    story.status = RequirementStatus.ARCHIVED;
    StoryRepository.save(story);
    CacheService.invalidate();
  }
}
