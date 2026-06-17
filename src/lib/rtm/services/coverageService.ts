import { TestcaseRepository } from "../repositories/testcaseRepository";

export class CoverageService {
  /**
   * Calculates if a given User Story is "Covered".
   * A Story is COVERED if it has at least one linked Testcase that is ACTIVE or APPROVED.
   */
  public static isCovered(projectId: string, storyId: string): boolean {
    const testcases = TestcaseRepository.findByProject(projectId);
    
    return testcases.some(tc => {
      // Must have an ACTIVE, APPROVED, DRAFT, or REVIEW status
      if (!["ACTIVE", "APPROVED", "DRAFT", "REVIEW"].includes(tc.status?.toUpperCase())) {
        return false;
      }

      // Safe fallback for older testcases missing userStories array
      const linkedStories = tc.userStories ?? [];
      
      // Must contain a link to this specific storyId
      return linkedStories.some((us: any) => us.id === storyId);
    });
  }

  /**
   * Calculates high-level coverage metrics for a given project.
   * Optimized to read testcases only once.
   */
  public static getMetrics(projectId: string, epicsCount: number, activeStories: any[]) {
    const totalEpics = epicsCount;
    const totalStories = activeStories.length;
    let coveredStories = 0;

    // Filter to valid testcases once to avoid repeated parsing in loop
    const testcases = TestcaseRepository.findByProject(projectId);
    const validTestcases = testcases.filter(tc => ["ACTIVE", "APPROVED", "DRAFT", "REVIEW"].includes(tc.status?.toUpperCase()));

    activeStories.forEach(story => {
      const isCov = validTestcases.some(tc => {
        const linked = tc.userStories ?? [];
        return linked.some((us: any) => us.id === story.id);
      });
      
      if (isCov) {
        coveredStories++;
      }
    });

    const uncoveredStories = totalStories - coveredStories;
    const coveragePercent = totalStories === 0 ? 0 : Math.round((coveredStories / totalStories) * 100);

    return {
      totalEpics,
      totalStories,
      coveredStories,
      uncoveredStories,
      coveragePercent
    };
  }
}
