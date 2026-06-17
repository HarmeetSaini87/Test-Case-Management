// src/types/filter.ts

export type FilterOperator =
  | '=' | '!=' | 'contains' | 'not contains' | 'starts with'
  | 'is' | 'is not' | 'in' | 'not in'
  | 'includes any' | 'includes all' | 'excludes'
  | 'before' | 'after' | 'between'
  | '>' | '>=' | '<' | '<='
  | 'is empty' | 'is not empty';

export type FilterConnector = 'AND' | 'OR';

export interface FilterRow {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | string[] | [string, string];
  connector: FilterConnector;
}

export interface SavedQuery {
  id: string;
  name: string;
  projectId: string;
  jql: string;
  createdBy: string;
  createdAt: string;
}

export const JQL_FIELD_MAP: Record<string, { label: string; type: 'text' | 'enum' | 'multi-enum' | 'date' | 'number' | 'tags' | 'lookup'; options?: string[] }> = {
  'testCaseId':        { label: 'TC ID',              type: 'text' },
  'title':             { label: 'Title',               type: 'text' },
  'priority':          { label: 'Priority',            type: 'multi-enum', options: ['Highest', 'High', 'Medium', 'Low'] },
  'status':            { label: 'Status',              type: 'multi-enum', options: ['Draft', 'Active', 'Review', 'Deprecated'] },
  'testCategory':      { label: 'Test Category',       type: 'multi-enum', options: ['Functional', 'Regression', 'Integration', 'Smoke', 'Sanity'] },
  'testingType':       { label: 'Testing Type',        type: 'multi-enum', options: ['Manual', 'Automation', 'Performance', 'Security'] },
  'testIntent':        { label: 'Test Intent',         type: 'multi-enum', options: ['Positive', 'Negative', 'Boundary', 'Validation', 'System Behavior'] },
  'automationType':    { label: 'Automation Type',     type: 'multi-enum', options: ['Not Automated', 'Automated', 'Semi-Automated'] },
  'module':            { label: 'Module',              type: 'text' },
  'subModule':         { label: 'Sub-Module',          type: 'text' },
  'entity':            { label: 'Entity',              type: 'text' },
  'labels':            { label: 'Labels',              type: 'tags' },
  'versionNumbers':    { label: 'Version',             type: 'tags' },
  'assignedTester':    { label: 'Assigned Tester',     type: 'text' },
  'createdBy':         { label: 'Created By',          type: 'text' },
  'updatedBy':         { label: 'Updated By',          type: 'text' },
  'createdDate':       { label: 'Created Date',        type: 'date' },
  'updatedDate':       { label: 'Updated Date',        type: 'date' },
  'estimatedTime':     { label: 'Est. Time (min)',      type: 'number' },
  'version':           { label: 'Version No.',         type: 'number' },
  'epic.key':          { label: 'Epic Key',            type: 'text' },
  'epic.name':         { label: 'Epic Name',           type: 'text' },
  'epic.status':       { label: 'Epic Status',         type: 'multi-enum', options: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'] },
  'story.key':         { label: 'Story Key',           type: 'text' },
  'story.title':       { label: 'Story Title',         type: 'text' },
  'story.status':      { label: 'Story Status',        type: 'multi-enum', options: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'] },
  'story.epicKey':     { label: 'Parent Epic (Story)', type: 'text' },
  'story.lastExecStatus': { label: 'Last Exec Status', type: 'multi-enum', options: ['Pass', 'Fail', 'Blocked', 'Pending'] },
};

export const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  text:         ['=', '!=', 'contains', 'not contains', 'starts with', 'is empty', 'is not empty'],
  'multi-enum': ['in', 'not in', 'is', 'is not'],
  date:         ['=', 'before', 'after', 'between'],
  number:       ['=', '!=', '>', '>=', '<', '<=', 'between'],
  tags:         ['includes any', 'includes all', 'excludes'],
  lookup:       ['=', '!=', 'is empty', 'is not empty'],
};

export function newFilterRow(): FilterRow {
  return {
    id: Math.random().toString(36).slice(2),
    field: 'priority',
    operator: 'in',
    value: [],
    connector: 'AND',
  };
}
