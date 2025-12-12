# v-sheet Documentation Master Guide

**Version**: 2.0 (AI-Optimized)
**Last Updated**: 2025-12-11
**Status**: Active Standard

---

## 1. Core Philosophy

To support both **Human Developers** and **AI Coding Agents**, this documentation strictly separates concerns to prevent hallucinations and conflicting context.

1. **Single Source of Truth**: A concept (e.g., "Formula Parsing") must have **one** authoritative description.
2. **Static vs. Dynamic Separation**:
   * **Static** documents describe *structure* (Components, Classes, Data).
   * **Dynamic** documents describe *flow* (Features, User Actions, Request Lifecycles).
3. **Transient vs. Permanent**:
   * **Specs** are transient (delete or archive after build).
   * **Architecture** is permanent (update as code changes).

---

## 2. The Folder Structure

```text
/docs/
├── CLAUDE.md                   # High-level agent context
├── DOCUMENTATION_STRUCTURE.md  # THIS FILE - The meta-guide
├── README.md                   # Project entry point
│
├── architecture/               # [PERMANENT] The "Internal Truth" of the system
│   ├── 00-system-overview.md   # High-level patterns & diagram
│   ├── 01-mode-system.md       # Core subsystem docs (Static)
│   ├── 02-formula-engine.md    # Formula parsing pipeline
│   ├── 03-ui-components.md     # UI module responsibilities
│   ├── 04-history-system.md    # Command pattern, undo/redo
│   ├── 05-file-persistence.md  # FileManager, autosave
│   │
│   ├── adr/                    # Architecture Decision Records
│   │   ├── 001-fsm-mode-system.md
│   │   ├── 002-web-worker-engine.md
│   │   └── 003-command-pattern-history.md
│   │
│   └── features/               # Vertical Slices (Dynamic)
│       ├── formatting-flow.md  # "How Bold Works" (UI -> DB)
│       └── formula-building.md # "How Point Mode Works"
│
├── manuals/                    # [PERMANENT] External behavioral references
│   ├── user-workflows.md       # Consolidated user guides
│   ├── api-reference/          # REST & Worker API contracts
│   │   ├── rest-api.md
│   │   ├── worker-protocol.md
│   │   └── intent-vocabulary.md
│   └── test-scenarios/         # Gherkin-style test specs
│       ├── data-entry.scenarios.md
│       ├── formula-building.scenarios.md
│       ├── navigation.scenarios.md
│       ├── selection-clipboard.scenarios.md
│       ├── history.scenarios.md
│       ├── formatting.scenarios.md
│       ├── border-formatting.scenarios.md
│       ├── fill-handle.scenarios.md
│       └── E2E_TEST_COVERAGE_SUMMARY.md
│
├── specs/                      # [TRANSIENT] Work management
│   ├── active/                 # Current task context
│   └── archive/                # Historical context (AI should deprioritize)
│
├── features/                   # Feature-specific documentation
│   └── fill-handle.md
│
├── md/                         # Technical deep-dives (legacy, to be migrated)
│
├── code-cleanup/               # Code quality assessments (historical)
│
└── legacy/                     # [IGNORED] Deprecated docs
    └── ux_architecture/        # Old FSM design docs (superseded by architecture/)
```

---

## 3. Document Types & Requirements

### 3.1 Vertical Slice Documentation (Dynamic)

**Location**: `docs/architecture/features/[feature-name]-flow.md`
**Purpose**: Traces a single feature from **User Input** all the way to **Persistence**.

**Requirements**:
* **Must** follow the Request Lifecycle (UI -> Logic -> Command -> View -> DB).
* **Must** name specific classes and methods.
* **Must** explain the "Magic" (e.g., Flyweight pattern in formatting).

**Template**:
```markdown
# Feature Walkthrough: [Feature Name]

**Primary Actor**: User
**Goal**: [e.g., Make cell bold]

## 1. The Trigger (UI Layer)
* **Event**: [e.g., Click on Toolbar Button]
* **Handler**: `[Component].js` -> `handleEvent()`
* **Action**: Calls coordinator `spreadsheet.applyX()`

## 2. Logic & Coordinator (Application Layer)
* **Coordinator**: `Spreadsheet.js`
* **Decision**: Calculates *what* needs to change.
* **Command Creation**: Instantiates `[CommandName]`.

## 3. The Command (History Layer)
* **Command**: `[CommandName].js`
* **Execution**:
    1.  Captures old state (for Undo).
    2.  Mutates Model (e.g., `FileManager.updateCell`).
    3.  Pushes to `HistoryManager`.

## 4. Visual Rendering (View Layer)
* **Renderer**: `GridRenderer.js`
* **Update**: `updateCellStyle()` updates the DOM node.

## 5. Persistence (Data Layer)
* **State**: `FileManager.js` marks file as dirty.
* **API**: Autosave triggers `PUT /api/files/:id`.
```

---

### 3.2 Component Documentation (Static)

**Location**: `docs/architecture/0*-[component-name].md`
**Purpose**: Defines *what* a module is, what data it owns, and its public interface.

**Requirements**:
* **Must** define "Data Owned" and "Boundaries".
* **Must NOT** contain long step-by-step user flows (link to `features/` instead).

**Template**:
```markdown
# [Component Name] Architecture

## Responsibility
[One-line description of what this component does]

## What It Does
- [Responsibility 1]
- [Responsibility 2]

## What It Doesn't Do
- ❌ [What it doesn't handle]
- ❌ [Delegated to other components]

## Data It Owns
- [State 1]
- [State 2]

## Key Methods (High-Level)
- `methodName()` - [What it does, not how]

## Dependencies
- [Component 1] - [Why needed]

## See Also
- [Related docs]
```

---

### 3.3 API Reference Documentation

**Location**: `docs/manuals/api-reference/`
**Purpose**: Defines contracts between components or with external systems.

**Requirements**:
* **Must** list inputs, outputs, and error codes.
* **Must** include examples.

---

### 3.4 Test Scenario Documentation

**Location**: `docs/manuals/test-scenarios/`
**Purpose**: Gherkin-style specifications for E2E tests.

**Requirements**:
* **Must** use Given-When-Then format.
* **Must** include Playwright implementation hints.

---

### 3.5 Architecture Decision Records (ADRs)

**Location**: `docs/architecture/adr/`
**Purpose**: Documents significant architectural decisions.

**Requirements**:
* **Must** explain the problem, alternatives considered, and rationale.
* **Must** list consequences (positive and negative).

---

## 4. Documentation Maintenance

### When to Update Documentation

1. **New Feature Added**
   - Add vertical slice to `architecture/features/`
   - Update user workflows in `manuals/user-workflows.md`
   - Add test scenarios to `manuals/test-scenarios/`
   - Create ADR if significant decision

2. **Feature Modified**
   - Update vertical slice if flow changes
   - Update component docs if interface changes
   - Update test scenarios

3. **Bug Fix**
   - Update test scenarios if new edge case discovered

4. **Refactoring**
   - Update architecture docs if structure changes
   - ADR if architectural pattern changes

---

## 5. Navigation Guide for AI Agents

### Finding Implementation Details

| Question | Where to Look |
|----------|---------------|
| "How does X feature work end-to-end?" | `architecture/features/` |
| "What is X component responsible for?" | `architecture/0*-[component].md` |
| "Why was X decision made?" | `architecture/adr/` |
| "How should X behave from user perspective?" | `manuals/user-workflows.md` |
| "What are the test cases for X?" | `manuals/test-scenarios/` |
| "What is the API contract for X?" | `manuals/api-reference/` |

### Priority Order for Context

1. **architecture/** - The source of truth for implementation
2. **manuals/** - Behavioral specifications
3. **specs/active/** - Current work context
4. **specs/archive/** - Historical context (deprioritize)
5. **legacy/** - Ignore unless specifically referenced

---

## 6. Legacy Content

The `legacy/` folder contains deprecated documentation that has been superseded:

- **`legacy/ux_architecture/`** - Old FSM design docs. Superseded by `architecture/01-mode-system.md`. Keep for historical reference but do not use for implementation guidance.

The `md/` folder contains technical deep-dives that should eventually be migrated to `architecture/`.

---

## 7. Quick Reference

### Key Principles

1. **One concept, one location** - Don't duplicate information
2. **Link, don't copy** - Reference related docs instead of repeating content
3. **Static vs Dynamic** - Component docs describe *what*, feature docs describe *how*
4. **Update with code** - Documentation is part of the definition of done

### File Naming Conventions

- Component docs: `00-system-overview.md`, `01-mode-system.md` (numbered for reading order)
- Feature flows: `[feature-name]-flow.md`
- Test scenarios: `[feature-name].scenarios.md`
- ADRs: `[number]-[decision-title].md`

---

**Document Status**: ✅ Active Standard

**Next Review**: 2026-03-11 (quarterly)
