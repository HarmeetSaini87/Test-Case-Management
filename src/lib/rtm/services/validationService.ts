import { CacheService } from "./cacheService";

export class ValidationService {
  /**
   * Validates that the provided Epic ID exists in the RTM catalog.
   * Prevents saving orphaned testcases.
   */
  public static validateEpicExists(epicId: string): boolean {
    const cache = CacheService.get();
    return !!cache.epics[epicId];
  }

  /**
   * Validates that all provided User Story IDs exist in the RTM catalog.
   */
  public static validateStoriesExist(storyIds: string[]): boolean {
    const cache = CacheService.get();
    return storyIds.every(id => !!cache.stories[id]);
  }

  /**
   * Validates a requirement key against the defined enterprise regex format.
   * Matches "PROJECT-123", rejects "project-123" or "PROJ 123".
   */
  public static isValidKeyFormat(key: string): boolean {
    const regex = /^[A-Z]+-\d+$/;
    return regex.test(key);
  }
}
