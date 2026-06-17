# Design Spec: Test Suite Edit + JQL Query Builder + Advanced Filters
**Date:** 2026-06-17  
**Project:** Panamax (Bankai)  
**Status:** Awaiting User Approval

---

## 1. Problem Statement

Three gaps exist in the current Test Suite management workflow:

1. **No Edit Suite** — Once a suite is created it is immutable. Name, description, sprint cannot be changed and TCs cannot be added post-creation.
2. **No Advanced Filtering** — Test Cases page has basic filters but no range operators (date between, number between) and no AND/OR logic between filter conditions.
3. **No Query-Based TC Selection** — Test cases are added to suites by manually ticking checkboxes. As the TC repository grows this becomes impractical. There is no way to say "add all Active, High-priority Regression TCs linked to Epic BSS-324."

---

## 2. Scope

| Feature | Pages Affected |
|---|---|
| Edit Test Suite (name, description, sprint, add/remove TCs) | `/suites` |
| Advanced Filter Bar (range + AND/OR) | `/testcases`, `/suites` |
| JQL Hybrid Query Builder (visual rows + typed JQL, live preview) | `/testcases` (suite creation modal), `/suites` (edit suite → add TCs) |
| Saved Queries (named, reusable) | `/testcases`, `/suites`, new API `/api/saved-queries` |

**Out of scope:** Debugger routes, execution recording, RTM matrix page, spec generation.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend Components (Next.js / React)                      │
│                                                             │
│  /testcases/page.tsx                                        │
│    ├── AdvancedFilterBar (upgraded — range + AND/OR)        │
│    └── CreateSuiteModal                                     │
│          └── JQLQueryBuilder (new shared component)         │
│                                                             │
│  /suites/page.tsx                                           │
│    ├── AdvancedFilterBar (suite-level fields)               │
│    └── EditSuitePanel (new slide-over)                      │
│          ├── Suite meta editor (name, desc, sprint)         │
│          ├── Existing TC list with remove                   │
│          └── JQLQueryBuilder (shared component)             │
│                                                             │
│  components/JQLQueryBuilder.tsx  ← NEW shared component     │
│  components/AdvancedFilterBar.tsx ← upgraded                │
└─────────────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐   ┌─────────────────────────┐
│  /api/suites     │   │  /api/saved-queries      │ ← NEW
│  (existing,      │   │  GET / POST / DELETE     │
│   POST upsert    │   │  dataHub/saved-queries/  │
│   already works) │   │  {project}.json          │
└──────────────────┘   └─────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  /api/testcases/query        │ ← NEW endpoint
│  POST { filters, logic }     │
│  Returns matching TC list    │
└──────────────────────────────┘
```

### New Files
- `src/app/components/JQLQueryBuilder.tsx` — shared query builder component
- `src/app/components/AdvancedFilterBar.tsx` — upgraded filter bar (extracted from page)
- `src/app/api/testcases/query/route.ts` — server-side filter execution
- `src/app/api/saved-queries/route.ts` — saved query CRUD
- `dataHub/saved-queries/{project}.json` — saved query storage per project

### Modified Files
- `src/app/testcases/page.tsx` — wire AdvancedFilterBar + JQLQueryBuilder into CreateSuiteModal
- `src/app/suites/page.tsx` — add EditSuitePanel + AdvancedFilterBar for suite list filtering

---

## 4. Feature Design

### 4.1 Advanced Filter Bar

Replaces the current simple filter row on `/testcases` and adds a new one on `/suites`.

#### Filter Row Structure
Each row has:
```
[Field ▼] [Operator ▼] [Value Input] [AND | OR] [× remove]
```
- The **AND / OR** pill at the end of each row is a toggle button controlling the logical connector to the NEXT row.
- Last row has no connector pill.
- **[+ Add Filter]** button adds a new row.
- **[Clear All]** resets to default (no filters).

#### Fields Available — Test Cases Page

| Group | Field | Input Type | Operators |
|---|---|---|---|
| **Identity** | TC ID | Text | `=`, `contains`, `starts with` |
| | Title | Text | `=`, `contains` |
| **Classification** | Priority | Multi-select | `is`, `is not`, `in`, `not in` |
| | Status | Multi-select | `is`, `is not`, `in`, `not in` |
| | Test Category | Multi-select | `is`, `is not`, `in`, `not in` |
| | Testing Type | Multi-select | `is`, `is not`, `in`, `not in` |
| | Test Intent | Multi-select | `is`, `is not`, `in`, `not in` |
| | Automation Type | Multi-select | `is`, `is not`, `in`, `not in` |
| **Structure** | Module | Dropdown | `is`, `is not` |
| | Sub-Module | Dropdown | `is`, `is not` |
| | Entity | Dropdown | `is`, `is not` |
| | Version | Multi-select | `includes any`, `includes all` |
| | Labels | Tag input | `includes any`, `includes all`, `excludes` |
| **People** | Assigned Tester | Text | `is`, `is not`, `is empty` |
| | Created By | Text | `is`, `is not` |
| | Updated By | Text | `is`, `is not` |
| **Dates** | Created Date | Date / Date Range | `=`, `before`, `after`, `between` |
| | Updated Date | Date / Date Range | `=`, `before`, `after`, `between` |
| **Metrics** | Estimated Time (min) | Number / Range | `=`, `>`, `>=`, `<`, `<=`, `between` |
| | Version No. | Number / Range | `=`, `>`, `>=`, `<`, `<=`, `between` |
| **RTM** | Epic Key | Text / Lookup | `=`, `contains`, `is empty` |
| | Epic Name | Text | `contains` |
| | Epic Status | Multi-select | `is`, `is not`, `in` |
| | Story Key | Text / Lookup | `=`, `contains`, `is empty` |
| | Story Title | Text | `contains` |
| | Story Status | Multi-select | `is`, `is not`, `in` |
| | Parent Epic (of Story) | Lookup | `is`, `is not` |
| | Last Execution Status | Multi-select | `is`, `is not` |

#### Fields Available — Suites Page

| Field | Input Type | Operators |
|---|---|---|
| Suite Name | Text | `=`, `contains` |
| Sprint | Dropdown | `is`, `is not`, `in` |
| Created By | Text | `is`, `is not` |
| Created Date | Date Range | `=`, `before`, `after`, `between` |
| TC Count | Number Range | `=`, `>`, `>=`, `<`, `<=`, `between` |

#### Range Input Rendering
When operator `between` is selected, the value column renders two inputs:
```
[Created Date ▼] [between ▼]  [📅 2026-01-01]  →  [📅 2026-06-17]
[Est. Time    ▼] [between ▼]  [  10  ]  →  [  60  ]  mins
```

#### Filter Execution
- All filtering runs **client-side** for the basic filter bar (TCs already loaded in page state).
- The JQL Query Builder (Section 4.2) uses the new server-side `/api/testcases/query` endpoint for fresh results.

#### Filter Persistence
- Active filters are stored in component state only (no URL params needed for v1).
- Saved named filters handled by Section 4.4.

---

### 4.2 JQL Hybrid Query Builder

A new shared React component `JQLQueryBuilder` used in two places:
1. Inside `CreateSuiteModal` on `/testcases` page (replaces / augments checkbox-only selection)
2. Inside `EditSuitePanel` on `/suites` page → "Add Test Cases" section

#### Component Layout

```
┌─ JQL Query Builder ──────────────────────────────────────────────────┐
│                                                                       │
│  ┌─ Visual Rows ──────────────────────────────────────────────────┐  │
│  │ [Priority      ▼] [in      ▼] [High, Highest ▼]   AND  [×]   │  │
│  │ [Status        ▼] [is      ▼] [Active        ▼]   AND  [×]   │  │
│  │ [Epic Key      ▼] [=       ▼] [BSS-324        ]   OR   [×]   │  │
│  │ [Created Date  ▼] [between ▼] [2026-01-01] → [2026-06-17]    │  │
│  │                                                    [×]         │  │
│  │ [+ Add Condition]                                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ JQL Statement (auto-generated, editable) ─────────────────────┐  │
│  │ priority in (High,Highest) AND status = "Active"               │  │
│  │ AND (epic.key = "BSS-324" OR                                   │  │
│  │ createdDate between "2026-01-01" and "2026-06-17")             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [Saved Queries ▼]  [Save This Query]                                │
│                                                                       │
│  ──────────────────────────────────────────────────────────────────  │
│  📋 Preview: 18 test cases match         [▼ Show Results]            │
│                                                                       │
│  □ BSSMED-TC-001  Login validation — High — Active                   │
│  □ BSSMED-TC-007  Export report — High — Active                      │
│  ✓ BSSMED-TC-014  (already in suite)                                 │
│  ... (paginated 10 per page)                                          │
│                                                                       │
│  [Select All New]  [Add Selected to Suite (14)]  [Cancel]            │
└───────────────────────────────────────────────────────────────────────┘
```

#### Sync Rules (Visual ↔ JQL Text)

| Action | Result |
|---|---|
| User edits a visual row | JQL text regenerates immediately |
| User types valid JQL in text area | Visual rows parse and update to match |
| User types invalid JQL | Red border on text area, error message below, rows unchanged |
| User changes AND/OR pill | JQL text updates grouping with parentheses |

#### JQL Parser (client-side)
- Supports: `field operator value`, `field in (v1,v2)`, `field between v1 and v2`, `AND`, `OR`, parentheses for OR groups.
- Invalid JQL: show inline error, keep last valid state in rows.
- JQL field names map to internal field keys via a static `JQL_FIELD_MAP` constant.

#### Preview / Results
- "Preview" count label updates with **500ms debounce** after any row/JQL change — calls `POST /api/testcases/query`.
- "Show Results" expands the paginated TC list (10 per page, client-side pagination of returned results).
- TCs already in the suite are shown with a ✓ badge and pre-checked (de-selectable).
- New matching TCs default to unchecked — user must explicitly select.
- "Select All New" checks all non-suite TCs.
- "Add Selected to Suite (N)" calls the suite upsert API and closes panel.

---

### 4.3 Edit Test Suite Panel

A slide-over panel (matching the existing Run Suite slide-over pattern) opened via an **[Edit]** button added to each row in the Suites list table.

#### Panel Sections

**Section A — Suite Metadata**
```
Suite Name *   [BSS Mediation Sprint_27          ]
Description    [                                  ]
Sprint *       [BSS Mediation Sprint _27    ▼]
               ○ Use existing  ● Create new sprint: [          ]
```
- All fields pre-populated from current suite data.
- Save triggers `POST /api/suites` with existing `id` (upsert pattern already in API).
- Validation: Suite Name required, Sprint required.

**Section B — Current Test Cases**
```
Search TCs: [              ]
┌─────────────────────────────────────────────────────┐
│ ✓  BSSMED-TC-001  Login validation     High  Active │
│ ✓  BSSMED-TC-007  Export report        High  Active │
│ ✗  [Remove]                                         │
└─────────────────────────────────────────────────────┘
```
- Each TC row has a [Remove] button → calls existing PATCH `/api/suites` (already implemented).
- Search filters displayed TCs by ID or title (client-side, no API call).

**Section C — Add Test Cases**
- A collapsible section with the JQLQueryBuilder component (Section 4.2) embedded.
- Header: **[+ Add Test Cases via Query Builder]** → expands/collapses.

#### Save Flow
1. User edits metadata → clicks **[Save Changes]** → PATCH/POST suite → success toast.
2. Remove TC → instant optimistic removal + API call, no full save needed.
3. Add TCs via Query Builder → "Add Selected" → suite `testCaseIds` array updated → panel refreshes TC list.

---

### 4.4 Saved Queries

#### Storage
`dataHub/saved-queries/{projectKey}.json`
```json
[
  {
    "id": "sq-1718600000000",
    "name": "Active High Priority Regression",
    "projectId": "BSSMED",
    "jql": "priority in (High,Highest) AND status = \"Active\" AND testCategory = \"Regression\"",
    "createdBy": "jayraj",
    "createdAt": "2026-06-17T10:00:00.000Z"
  }
]
```

#### API — `/api/saved-queries/route.ts`
| Method | Params | Action |
|---|---|---|
| GET | `?project=BSSMED` | Return all saved queries for project |
| POST | `{ name, projectId, jql, createdBy }` | Create new saved query |
| DELETE | `?id=sq-xxx` | Delete a saved query |

#### UI
- **[Saved Queries ▼]** dropdown in JQLQueryBuilder toolbar — lists saved queries for current project.
- Selecting one loads its JQL into the text area and syncs to visual rows.
- **[Save This Query]** opens a small popover: `Query Name: [         ] [Save]`
- Delete: long-press or hover on saved query item shows a trash icon.

---

### 5. New API Endpoint — `/api/testcases/query`

`POST /api/testcases/query`

**Request body:**
```json
{
  "projectId": "BSSMED",
  "filters": [
    { "field": "priority", "operator": "in", "value": ["High", "Highest"], "connector": "AND" },
    { "field": "status", "operator": "is", "value": "Active", "connector": "AND" },
    { "field": "createdDate", "operator": "between", "value": ["2026-01-01", "2026-06-17"], "connector": null }
  ]
}
```

**Response:**
```json
{
  "count": 18,
  "testCases": [
    { "testCaseId": "BSSMED-TC-001", "title": "...", "priority": "High", "status": "Active", ... }
  ]
}
```

**Implementation notes:**
- Reads all TC JSON files for the project from `dataHub/testcases/`.
- Applies each filter in sequence respecting AND/OR connectors.
- For RTM fields (epic, userStory), resolves from `dataHub/rtm/epics.json` and `dataHub/rtm/stories.json`.
- `between` for dates: inclusive range comparison using `Date` objects.
- `between` for numbers: inclusive numeric range.
- Returns full TC objects (fields needed for preview display).
- No pagination on server — pagination is client-side in JQLQueryBuilder component.

---

## 6. Component Props Interface (TypeScript)

```typescript
// Filter row type (shared between AdvancedFilterBar and JQLQueryBuilder)
interface FilterRow {
  id: string;              // uuid for React key
  field: string;           // e.g. "priority", "createdDate", "epic.key"
  operator: string;        // e.g. "in", "between", "contains"
  value: string | string[] | [string, string];  // single, multi, or range
  connector: 'AND' | 'OR'; // connector TO next row (last row ignored)
}

// JQLQueryBuilder props
interface JQLQueryBuilderProps {
  projectId: string;
  existingSuiteIds?: string[];        // TCs already in suite — shown with ✓
  onAddToSuite: (tcIds: string[]) => void;
  onCancel: () => void;
}

// AdvancedFilterBar props
interface AdvancedFilterBarProps {
  mode: 'testcases' | 'suites';
  projectId: string;
  onChange: (rows: FilterRow[]) => void;  // called on every change
  initialRows?: FilterRow[];
}

// SavedQuery type
interface SavedQuery {
  id: string;
  name: string;
  projectId: string;
  jql: string;
  createdBy: string;
  createdAt: string;
}
```

---

## 7. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| JQL text is invalid | Red border + inline parse error message. Visual rows unchanged. JQL not sent to API. |
| Query returns 0 results | "No test cases match this query" empty state with illustration. |
| All matching TCs already in suite | "All matching test cases are already in this suite" message. Add button disabled. |
| Suite name already exists on save | API returns 409, show inline error under Suite Name field. |
| Network error during preview | Show "Preview unavailable" with retry button. Do not block UI. |
| `between` range: from > to | Inline validation error "Start must be before end" on the range input. |
| Removing last TC from suite | Allowed — suite remains with empty `testCaseIds`. Warning toast shown. |
| Cyclic AND/OR grouping | Client-side: OR rows are auto-wrapped in parentheses in JQL output. Parser handles this correctly. |
| RTM fields with no epic/story data | Filter still executes; TCs without epic/story never match RTM conditions (no false positives). |
| Large TC repository (1000+ TCs) | `/api/testcases/query` reads files once per request. No in-memory caching needed at current scale. |

---

## 8. UI/UX Standards (matching existing Panamax patterns)

- Slide-over panels: same width (640px), same overlay/backdrop as Run Suite panel.
- Buttons: same Tailwind classes as existing primary/secondary/danger buttons.
- Toast notifications: reuse existing toast pattern already in suites page.
- Filter row dropdowns: use same dropdown component style as existing filters.
- Loading states: spinner on preview count while API call is in flight.
- Optimistic UI: TC removal from suite reflects immediately; reverses on API error.
- All new components are `"use client"` — no server components needed.
- No new dependencies to be introduced. Use existing Lucide React icons, Tailwind, and React state.

---

## 9. Implementation Order (Risk-Ordered)

1. **`/api/testcases/query`** — server-side filter engine (no UI dependency, testable in isolation)
2. **`/api/saved-queries`** — simple CRUD, no dependencies
3. **`AdvancedFilterBar` component** — upgrade existing filter UI on `/testcases`
4. **`JQLQueryBuilder` component** — build visual rows + JQL text sync + preview
5. **`CreateSuiteModal` upgrade** — embed JQLQueryBuilder (replaces checkbox-only flow)
6. **`EditSuitePanel`** — new slide-over on `/suites` with metadata + TC management + JQLQueryBuilder
7. **Suite list filter bar** — add AdvancedFilterBar to `/suites` page

---

## 10. What Is NOT Changing

- Run Suite panel — untouched
- TC create/edit forms — untouched
- specGenerator.ts — untouched (LOCKED per project rules)
- Debugger routes — untouched
- Port 3003 (DEV) restart — Admin → Settings → Reset Server only
- `data/jira-config.json` — untouched
