export enum RequirementStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  ARCHIVED = "ARCHIVED",
  DEPRECATED = "DEPRECATED",
}

export interface ExternalMapping {
  system: "JIRA" | "AZURE" | "OTHER";
  id: string;
  url: string;
}

export interface Epic {
  id: string;
  projectId: string;
  key: string;
  name: string;
  status: RequirementStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  external?: ExternalMapping;
}

export interface UserStory {
  id: string;
  projectId: string;
  epicId: string;
  key: string;
  title: string;
  status: RequirementStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  external?: ExternalMapping;
  coverage?: {
    lastExecutionStatus: string | null;
  };
}

export interface HybridEpicSnapshot {
  id: string;
  key: string;
  name: string;
}

export interface HybridStorySnapshot {
  id: string;
  key: string;
  title: string;
}

export interface TestCaseRtmExtension {
  projectId?: string;
  epic?: HybridEpicSnapshot;
  userStories?: HybridStorySnapshot[];
}

export interface RtmCache {
  schemaVersion: 1;
  lastUpdated: string;
  epics: Record<string, Epic>; // Keyed by ID for O(1) lookups
  stories: Record<string, UserStory>;
}

export interface EpicsDatabase {
  schemaVersion: 1;
  epics: Epic[];
}

export interface StoriesDatabase {
  schemaVersion: 1;
  stories: UserStory[];
}
