import { EpicRepository } from "../repositories/epicRepository";
import { StoryRepository } from "../repositories/storyRepository";
import { CacheService } from "./cacheService";
import { ValidationService } from "./validationService";
import { normalizeKey } from "../utils/normalization";
import { Epic, RequirementStatus } from "../types/rtm";

export class EpicService {
  /**
   * Creates or updates an Epic, enforcing normalization, validation, and uniqueness.
   */
  public static createOrUpdate(epicData: Partial<Epic>): Epic {
    if (!epicData.projectId || !epicData.key || !epicData.name) {
      throw new Error("Missing required Epic fields (projectId, key, name).");
    }

    const normalizedKey = normalizeKey(epicData.key);
    if (!ValidationService.isValidKeyFormat(normalizedKey)) {
      throw new Error(`Invalid Epic key format: ${epicData.key}. Expected format like "BSS-123".`);
    }

    // Duplicate prevention check (on Create)
    if (!epicData.id) {
      const existing = EpicRepository.findByProject(epicData.projectId).find(e => e.key === normalizedKey);
      if (existing) {
        throw new Error(`Epic with key ${normalizedKey} already exists in project ${epicData.projectId}.`);
      }
    }

    const epic: Epic = {
      id: epicData.id || `rtm-epic-${Date.now()}`,
      projectId: epicData.projectId,
      key: normalizedKey,
      name: epicData.name,
      status: epicData.status || RequirementStatus.ACTIVE,
      version: epicData.version || 0,
      createdAt: epicData.createdAt || new Date().toISOString(),
      updatedAt: epicData.updatedAt || new Date().toISOString(),
      external: epicData.external
    };

    const saved = EpicRepository.save(epic);
    
    // Invalidate cache on write
    CacheService.invalidate();
    return saved;
  }

  /**
   * Soft deletes an Epic. Protects against archiving if active stories are still linked.
   */
  public static archive(epicId: string): void {
    const epic = EpicRepository.findById(epicId);
    if (!epic) throw new Error("Epic not found.");

    // Archive protection rule
    const activeStories = StoryRepository.findByEpic(epicId).filter(s => s.status === RequirementStatus.ACTIVE);
    if (activeStories.length > 0) {
      throw new Error("Cannot archive Epic because it contains ACTIVE User Stories. Archive or reassign them first.");
    }

    epic.status = RequirementStatus.ARCHIVED;
    EpicRepository.save(epic);
    CacheService.invalidate();
  }
}
