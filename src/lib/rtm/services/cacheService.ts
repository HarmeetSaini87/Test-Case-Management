import { EpicRepository } from "../repositories/epicRepository";
import { StoryRepository } from "../repositories/storyRepository";
import { RtmCache } from "../types/rtm";

export class CacheService {
  private static cache: RtmCache | null = null;

  /**
   * Retrieves the current RTM cache. Warms it if uninitialized.
   */
  public static get(): RtmCache {
    if (!this.cache) {
      this.warm();
    }
    return this.cache!;
  }

  /**
   * Invalidates the in-memory cache, forcing a cold read on the next request.
   */
  public static invalidate(): void {
    this.cache = null;
  }

  /**
   * Warms the cache by reading from the repository layer and mapping IDs for O(1) lookups.
   */
  public static warm(): void {
    const epics = EpicRepository.findAll();
    const stories = StoryRepository.findAll();

    const epicMap: Record<string, any> = {};
    epics.forEach(e => { epicMap[e.id] = e; });

    const storyMap: Record<string, any> = {};
    stories.forEach(s => { storyMap[s.id] = s; });

    this.cache = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      epics: epicMap,
      stories: storyMap
    };
  }
}
