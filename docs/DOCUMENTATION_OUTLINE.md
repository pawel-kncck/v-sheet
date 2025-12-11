# v-sheet Documentation Outline

**Purpose**: Complete inventory of documentation for the v-sheet codebase.
**Last Updated**: 2025-12-12
**Status**: COMPLETE - All planned documentation has been created.

---

## Legend

- ✅ **EXISTS** - Document exists and is complete
- 🔶 **PARTIAL** - Document exists but needs expansion
- ❌ **MISSING** - Document does not exist

---

## 1. Architecture Documents (`docs/architecture/`)

### 1.1 Component Documentation (Static)

| Document | Status | Description |
|----------|--------|-------------|
| `00-system-overview.md` | ✅ EXISTS | High-level architecture, component responsibilities, data flows |
| `01-mode-system.md` | ✅ EXISTS | FSM architecture, mode lifecycle, intent handling |
| `02-formula-engine.md` | ✅ EXISTS | Parsing pipeline, evaluation, dependency graph |
| `03-ui-components.md` | ✅ EXISTS | UI module overview (GridRenderer, SelectionManager, etc.) |
| `04-history-system.md` | ✅ EXISTS | Command pattern, undo/redo, command types |
| `05-file-persistence.md` | ✅ EXISTS | FileManager, Flask API, autosave, file format |
| `06-styling-system.md` | ✅ EXISTS | StyleManager, Flyweight pattern, style merging |
| `07-input-controller.md` | ✅ EXISTS | Event gateway, platform normalization, intent mapping |
| `08-selection-system.md` | ✅ EXISTS | SelectionManager deep dive, range handling, edge detection |
| `09-clipboard-system.md` | ✅ EXISTS | ClipboardManager, formula adjustment on paste, style copying |

### 1.2 Vertical Slice Documentation (Dynamic) - `docs/architecture/features/`

| Document | Status | Description |
|----------|--------|-------------|
| `formatting-flow.md` | ✅ EXISTS | Bold/Italic/Colors: Toolbar → Command → Render → Persist |
| `formula-building.md` | ✅ EXISTS | Point Mode: Trigger → Reference Update → Commit |
| `cell-editing-flow.md` | ✅ EXISTS | Edit/Enter modes: Key press → Editor → Commit → Worker |
| `copy-paste-flow.md` | ✅ EXISTS | Clipboard: Copy → Store → Paste → Formula Adjust |
| `undo-redo-flow.md` | ✅ EXISTS | History: Command → Stack → Undo → Redo |
| `selection-flow.md` | ✅ EXISTS | Click/Shift/Ctrl selection patterns |
| `fill-handle-flow.md` | ✅ EXISTS | Drag fill: Pattern detection → Fill → Command |
| `fill-handle-spec.md` | ✅ EXISTS | Detailed fill handle feature specification |
| `resize-flow.md` | ✅ EXISTS | Column/Row resize: Drag → Preview → Command |
| `navigation-flow.md` | ✅ EXISTS | Arrow keys, Ctrl+Arrow jump to edge, Tab/Enter |

### 1.3 Architecture Decision Records - `docs/architecture/adr/`

| Document | Status | Description |
|----------|--------|-------------|
| `001-fsm-mode-system.md` | ✅ EXISTS | Why FSM for modes, alternatives considered |
| `002-web-worker-engine.md` | ✅ EXISTS | Why Web Worker for formulas |
| `003-command-pattern-history.md` | ✅ EXISTS | Why Command pattern for undo/redo |
| `004-flyweight-styles.md` | ✅ EXISTS | Why StyleManager uses Flyweight pattern |
| `005-intent-abstraction.md` | ✅ EXISTS | Why semantic intents vs raw events |
| `006-universal-parser.md` | ✅ EXISTS | Why parser doesn't hardcode function names |

### 1.4 Formula Engine Deep Dives - `docs/architecture/formula-engine/`

| Document | Status | Description |
|----------|--------|-------------|
| `parser-grammar.md` | ✅ EXISTS | Formal grammar specification (BNF-style) |
| `ast-node-types.md` | ✅ EXISTS | All AST node types with examples |
| `functions-reference.md` | ✅ EXISTS | All functions: signature, examples, edge cases |
| `error-types.md` | ✅ EXISTS | All error types (#DIV/0!, #NAME!, #REF!, etc.) |
| `type-coercion-rules.md` | ✅ EXISTS | How types are coerced (string→number, etc.) |
| `dependency-graph.md` | ✅ EXISTS | How dependencies are tracked and recalculated |

---

## 2. Manuals (`docs/manuals/`)

### 2.1 User Workflows

| Document | Status | Description |
|----------|--------|-------------|
| `user-workflows.md` | ✅ EXISTS | All user workflows consolidated |

### 2.2 API Reference - `docs/manuals/api-reference/`

| Document | Status | Description |
|----------|--------|-------------|
| `rest-api.md` | ✅ EXISTS | Flask REST endpoints |
| `worker-protocol.md` | ✅ EXISTS | Main ↔ Worker message format |
| `intent-vocabulary.md` | ✅ EXISTS | All intents with context shapes |
| `style-object-schema.md` | ✅ EXISTS | Complete style object structure |
| `file-format-schema.md` | ✅ EXISTS | JSON file format specification |
| `command-interfaces.md` | ✅ EXISTS | Command class interfaces and contracts |

### 2.3 Test Scenarios - `docs/manuals/test-scenarios/`

| Document | Status | Description |
|----------|--------|-------------|
| `data-entry.scenarios.md` | ✅ EXISTS | Data entry test cases |
| `formula-building.scenarios.md` | ✅ EXISTS | Formula building test cases |
| `navigation.scenarios.md` | ✅ EXISTS | Navigation test cases |
| `selection-clipboard.scenarios.md` | ✅ EXISTS | Selection and clipboard test cases |
| `history.scenarios.md` | ✅ EXISTS | Undo/redo test cases |
| `formatting.scenarios.md` | ✅ EXISTS | Cell formatting test cases |
| `border-formatting.scenarios.md` | ✅ EXISTS | Border formatting test cases |
| `fill-handle.scenarios.md` | ✅ EXISTS | Fill handle test cases |
| `resize.scenarios.md` | ✅ EXISTS | Column/row resize test cases |
| `error-handling.scenarios.md` | ✅ EXISTS | Formula error test cases |
| `E2E_TEST_COVERAGE_SUMMARY.md` | ✅ EXISTS | Test coverage summary |

---

## 3. Specs & Legacy

### 3.1 Specs - `docs/specs/`

| Document | Status | Description |
|----------|--------|-------------|
| `archive/` | ✅ EXISTS | Archived roadmap and planning documents |

### 3.2 Legacy - `docs/legacy/`

| Document | Status | Description |
|----------|--------|-------------|
| `ux_architecture/` | ✅ EXISTS | Archived UX architecture documents |

---

## 4. Final Documentation Structure

```
docs/
├── CLAUDE.md
├── DOCUMENTATION_STRUCTURE.md
├── DOCUMENTATION_OUTLINE.md          # THIS FILE
├── README.md
│
├── architecture/
│   ├── 00-system-overview.md         ✅
│   ├── 01-mode-system.md             ✅
│   ├── 02-formula-engine.md          ✅
│   ├── 03-ui-components.md           ✅
│   ├── 04-history-system.md          ✅
│   ├── 05-file-persistence.md        ✅
│   ├── 06-styling-system.md          ✅
│   ├── 07-input-controller.md        ✅
│   ├── 08-selection-system.md        ✅
│   ├── 09-clipboard-system.md        ✅
│   │
│   ├── adr/
│   │   ├── 001-fsm-mode-system.md    ✅
│   │   ├── 002-web-worker-engine.md  ✅
│   │   ├── 003-command-pattern-history.md ✅
│   │   ├── 004-flyweight-styles.md   ✅
│   │   ├── 005-intent-abstraction.md ✅
│   │   └── 006-universal-parser.md   ✅
│   │
│   ├── features/
│   │   ├── formatting-flow.md        ✅
│   │   ├── formula-building.md       ✅
│   │   ├── cell-editing-flow.md      ✅
│   │   ├── copy-paste-flow.md        ✅
│   │   ├── undo-redo-flow.md         ✅
│   │   ├── selection-flow.md         ✅
│   │   ├── fill-handle-flow.md       ✅
│   │   ├── fill-handle-spec.md       ✅
│   │   ├── resize-flow.md            ✅
│   │   └── navigation-flow.md        ✅
│   │
│   └── formula-engine/
│       ├── parser-grammar.md         ✅
│       ├── ast-node-types.md         ✅
│       ├── functions-reference.md    ✅
│       ├── error-types.md            ✅
│       ├── type-coercion-rules.md    ✅
│       └── dependency-graph.md       ✅
│
├── manuals/
│   ├── user-workflows.md             ✅
│   │
│   ├── api-reference/
│   │   ├── rest-api.md               ✅
│   │   ├── worker-protocol.md        ✅
│   │   ├── intent-vocabulary.md      ✅
│   │   ├── style-object-schema.md    ✅
│   │   ├── file-format-schema.md     ✅
│   │   └── command-interfaces.md     ✅
│   │
│   └── test-scenarios/
│       ├── data-entry.scenarios.md   ✅
│       ├── formula-building.scenarios.md ✅
│       ├── navigation.scenarios.md   ✅
│       ├── selection-clipboard.scenarios.md ✅
│       ├── history.scenarios.md      ✅
│       ├── formatting.scenarios.md   ✅
│       ├── border-formatting.scenarios.md ✅
│       ├── fill-handle.scenarios.md  ✅
│       ├── resize.scenarios.md       ✅
│       ├── error-handling.scenarios.md ✅
│       └── E2E_TEST_COVERAGE_SUMMARY.md ✅
│
├── specs/
│   └── archive/                      ✅
│
└── legacy/
    └── ux_architecture/              ✅
```

---

## 5. Statistics

| Category | Count |
|----------|-------|
| Component Docs | 10 |
| Feature Flows | 10 |
| ADRs | 6 |
| Formula Engine Docs | 6 |
| API Reference | 6 |
| Test Scenarios | 11 |
| **TOTAL** | **49** |

**Coverage**: 100% - All planned documentation complete.

---

## 6. Document Categories

### By Audience

| Audience | Documents |
|----------|-----------|
| **New developers** | system-overview, mode-system, formula-engine |
| **Feature developers** | Feature flows, API references |
| **Testers** | Test scenarios |
| **Architects** | ADRs, component docs |

### By Update Frequency

| Frequency | Documents |
|-----------|-----------|
| **Rarely changes** | ADRs, component architecture |
| **Changes with features** | Feature flows, test scenarios |
| **Reference only** | API schemas, function reference |

---

## 7. Maintenance Notes

### When Adding New Features

1. Create feature flow document in `architecture/features/`
2. Add test scenarios in `manuals/test-scenarios/`
3. Update relevant component docs if architecture changes
4. Consider if ADR is needed for significant decisions

### When Adding New Functions

1. Add to `architecture/formula-engine/functions-reference.md`
2. Add error handling test cases if new error types

### When Changing Architecture

1. Create ADR documenting the decision
2. Update affected component documentation
3. Update affected feature flows
