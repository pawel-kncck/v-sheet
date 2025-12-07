# v-sheet Documentation Structure

**Purpose**: This file defines the recommended documentation structure for v-sheet, serving as a guide for maintaining and expanding documentation.

**Last Updated**: 2025-12-07

---

## Documentation Goals

This documentation structure serves three primary audiences:

1. **Coding Agents** (AI assistants, new developers)
   - Quick context on component boundaries
   - High-level architecture without code details
   - Clear API contracts and extension points

2. **E2E Test Designers**
   - User workflows and expected behaviors
   - Given-When-Then test scenarios
   - Systematic coverage of user interactions

3. **Architecture Analysts**
   - System overview and design patterns
   - Component responsibilities and data flows
   - Architecture decisions and trade-offs

---

## Documentation Principles

### 1. Separate User Perspective from Technical Implementation
- **User-facing docs**: Detailed, step-by-step workflows
- **Technical docs**: High-level, let code be self-documenting

### 2. Bridge Perspectives
- User workflows → Mode behaviors → Technical components
- Test scenarios reference user workflows
- Architecture docs explain user-facing behavior

### 3. Cross-Reference Related Documents
- Each document links to related docs
- Clear navigation between user/test/architecture views

### 4. Incremental Documentation
- Core documents created first
- Additional docs added as needed
- Status tracking for each document

---

## Recommended Folder Structure

```
/docs/
├── DOCUMENTATION_STRUCTURE.md      # This file - documentation guide
├── README.md                       # User-facing project overview (existing)
├── CLAUDE.md                       # AI agent context (existing)
│
├── user-interactions/              # User-centric workflow documentation
│   ├── 01-core-workflows.md        ✅ COMPLETE (15 workflows)
│   ├── 02-mode-behaviors.md        ✅ COMPLETE (all 4 modes)
│   ├── 03-keyboard-shortcuts.md    ✅ COMPLETE (complete reference)
│   └── 04-advanced-scenarios.md    ✅ COMPLETE (15 complex scenarios)
│
├── test-scenarios/                 # E2E test specifications (Given-When-Then)
│   ├── data-entry.scenarios.md     ✅ COMPLETE (18 scenarios)
│   ├── formula-building.scenarios.md   ✅ COMPLETE (28 scenarios)
│   ├── navigation.scenarios.md     ✅ COMPLETE (24 scenarios)
│   ├── selection-clipboard.scenarios.md ✅ COMPLETE (27 scenarios)
│   └── history.scenarios.md        ✅ COMPLETE (20 scenarios)
│
├── architecture/                   # High-level technical documentation
│   ├── 00-system-overview.md       ✅ COMPLETE (component responsibilities, data flows)
│   ├── 01-mode-system.md           ✅ COMPLETE (FSM architecture, lifecycle, patterns)
│   ├── 02-formula-engine.md        ✅ COMPLETE (parsing pipeline, dependency graph, universal parser)
│   ├── 03-ui-components.md         ✅ COMPLETE (5 UI components, event patterns, data flow)
│   ├── 04-history-system.md        ✅ COMPLETE (Command pattern, 4 command types, lifecycle)
│   ├── 05-file-persistence.md      ✅ COMPLETE (FileManager, Flask API, auto-save, flyweight)
│   └── diagrams/                   📁 (for architecture diagrams)
│
├── api-reference/                  # API contracts and protocols
│   ├── rest-api.md                 ✅ COMPLETE (7 endpoints, data formats, examples)
│   ├── worker-protocol.md          ✅ COMPLETE (5 message types, protocol flows, examples)
│   └── intent-vocabulary.md        ✅ COMPLETE (all intents documented)
│
├── adr/                            # Architecture Decision Records
│   ├── 001-fsm-mode-system.md      ✅ COMPLETE (why FSM, alternatives, consequences)
│   ├── 002-web-worker-engine.md    ✅ COMPLETE (why web worker, 4 alternatives, benchmarks)
│   └── 003-command-pattern-history.md ✅ COMPLETE (why command pattern, 4 alternatives, metrics)
│
├── roadmap/                        # Product planning (existing)
│   ├── roadmap-outline.md          📄 EXISTS
│   ├── app_modes.md                📄 EXISTS
│   └── epics/                      📁 (move epic files here)
│       ├── epic-01-history.md
│       ├── epic-02-testing.md
│       └── ... (other epics)
│
├── ux_architecture/                # FSM design docs (existing - to be consolidated)
│   └── (content to be moved to architecture/ and user-interactions/)
│
├── md/                             # Technical deep-dives (existing - to be consolidated)
│   └── (content to be moved to architecture/)
│
└── code-cleanup/                   # Code quality assessments (existing)
    └── (keep as-is for historical reference)
```

---

## Document Status

### ✅ Complete (22 documents)
1. user-interactions/01-core-workflows.md
2. user-interactions/02-mode-behaviors.md
3. user-interactions/03-keyboard-shortcuts.md
4. user-interactions/04-advanced-scenarios.md
5. test-scenarios/data-entry.scenarios.md
6. test-scenarios/formula-building.scenarios.md
7. test-scenarios/navigation.scenarios.md
8. test-scenarios/selection-clipboard.scenarios.md
9. test-scenarios/history.scenarios.md
10. architecture/00-system-overview.md
11. architecture/01-mode-system.md
12. architecture/02-formula-engine.md
13. architecture/03-ui-components.md
14. architecture/04-history-system.md
15. architecture/05-file-persistence.md
16. api-reference/intent-vocabulary.md
17. api-reference/rest-api.md
18. api-reference/worker-protocol.md
19. adr/001-fsm-mode-system.md
20. adr/002-web-worker-engine.md
21. adr/003-command-pattern-history.md
22. (folder structure created)

### ⏳ Recommended Next (Priority Order)

**All recommended documentation is complete!** ✅

---

## Document Templates

### User-Interactions Document Template

```markdown
# [Feature Name] User Workflows

## Workflow: [Workflow Name]

**Goal**: [What the user wants to accomplish]

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | [Action] | [What user sees] | [State change] | [Mode] |
| 2 | ... | ... | ... | ... |

### Key Behaviors
- [Important behavior 1]
- [Important behavior 2]

### Mode Transitions
```
[Mode A] → [Mode B] (trigger)
```

---

### Test Scenario Document Template

```markdown
# [Feature] Test Scenarios

## Scenario X.Y: [Scenario Name]

**Given** [initial state]
**When** [user action]
**Then**:
- [expected result 1]
- [expected result 2]

**Playwright Implementation**:
```javascript
test('[test name]', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Given
  [setup]

  // When
  [action]

  // Then
  [assertions]
});
```

---

### Architecture Document Template

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
- [Component 2] - [Why needed]

## Data Flow
```
Input → [Component] → Output
```

## See Also
- [Related user doc]
- [Related test doc]
- [Related architecture doc]
```

---

### ADR (Architecture Decision Record) Template

```markdown
# ADR [Number]: [Decision Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]

**Date**: YYYY-MM-DD

**Deciders**: [Who made this decision]

---

## Context

[Problem statement - what issue are we solving?]

### Problem Scenarios
1. [Scenario 1]
2. [Scenario 2]

---

## Decision

[What we decided to do]

### Approach
[Description of the solution]

---

## Rationale

### Alternatives Considered

#### Alternative 1: [Name]
[Description]
**Rejected**: [Why]

#### Alternative 2: [Name]
[Description]
**Rejected**: [Why]

### Why This Decision is Better
1. [Reason 1]
2. [Reason 2]

---

## Consequences

### Positive
1. [Benefit 1]
2. [Benefit 2]

### Negative
1. [Trade-off 1 and mitigation]
2. [Trade-off 2 and mitigation]

---

## Implementation Details
[High-level overview, not code]

---

## Validation
[How we know this works - tests, metrics, etc.]

---

## Related Decisions
- ADR XXX: [Related decision]

---

## Future Considerations
[What might change, what to watch out for]

---

**Status**: ✅ **ACCEPTED** | ⏳ **PROPOSED** | ⛔ **DEPRECATED**

**Last Reviewed**: YYYY-MM-DD
```

---

## Content Guidelines

### User-Interactions Documents

**Focus**:
- **User actions** and what they see
- **Mode behaviors** from user perspective
- **Step-by-step workflows**

**Style**:
- Detailed and explicit
- Visual feedback described
- System state changes noted

**Avoid**:
- Implementation details
- Code snippets (unless for context)
- Technical jargon without explanation

**Example**:
✅ Good: "User presses Arrow Right → Cell B2 is selected → Mode is Ready"
❌ Bad: "SelectionManager.setActiveCell() is called with address 'B2'"

---

### Test Scenarios Documents

**Focus**:
- **Given-When-Then** format
- **Playwright implementation** hints
- **Expected outcomes** (visual + state)

**Style**:
- Clear, testable assertions
- Ready to translate to code
- Each scenario is independent

**Avoid**:
- Vague assertions
- Multiple concepts in one scenario
- Missing setup or teardown

**Example**:
✅ Good: "Given user is at cell A1, When user types '100' and presses Tab, Then cell A1 contains '100' AND cell B1 is selected"
❌ Bad: "Test data entry" (too vague)

---

### Architecture Documents

**Focus**:
- **Component responsibilities** (one-liners)
- **Data flows** (not implementation)
- **Module boundaries** (what it does/doesn't do)

**Style**:
- High-level, conceptual
- Focus on WHY and WHAT, not HOW
- Let code be self-documenting

**Avoid**:
- Code snippets (unless essential for clarity)
- Implementation details
- Low-level algorithms

**Example**:
✅ Good: "SelectionManager tracks active cell and selection ranges"
❌ Bad: "SelectionManager stores activeCell as {row, col} object and ranges as array of {start, end} objects with methods calculateBounds() and isInRange()"

---

### API Reference Documents

**Focus**:
- **Interface contracts** (inputs, outputs)
- **Message formats**
- **Error codes and handling**

**Style**:
- Precise and complete
- Examples for each endpoint/message
- Clear request/response formats

**Avoid**:
- Implementation details
- Business logic (belongs in architecture docs)

**Example**:
✅ Good: "POST /api/files - Creates new file. Request body: {name: string}. Response: {id: string, name: string}"
❌ Bad: "The create file endpoint uses UUID generation and stores in data/files/"

---

### ADR Documents

**Focus**:
- **Why the decision was made**
- **Alternatives considered**
- **Trade-offs and consequences**

**Style**:
- Historical record (past tense for decision)
- Balanced (pros and cons)
- Context-rich (why was this a problem?)

**Avoid**:
- Justifying decisions retroactively
- Hiding downsides
- Lack of alternatives

**Example**:
✅ Good: "We chose FSM over boolean flags because it eliminates state explosion and makes modes testable in isolation. Trade-off: More indirection."
❌ Bad: "FSM is the best approach" (no alternatives, no trade-offs)

---

## Cross-References Between Documents

### User Workflow → Test Scenarios
```markdown
<!-- In user-interactions/01-core-workflows.md -->
See test scenarios: /docs/test-scenarios/data-entry.scenarios.md
```

### Test Scenarios → User Workflows
```markdown
<!-- In test-scenarios/data-entry.scenarios.md -->
User workflow reference: /docs/user-interactions/01-core-workflows.md
```

### User Workflows → Architecture
```markdown
<!-- In user-interactions/02-mode-behaviors.md -->
For technical details: /docs/architecture/01-mode-system.md
```

### Architecture → User Workflows
```markdown
<!-- In architecture/00-system-overview.md -->
User perspective: /docs/user-interactions/02-mode-behaviors.md
```

### Architecture → ADR
```markdown
<!-- In architecture/01-mode-system.md -->
Decision rationale: /docs/adr/001-fsm-mode-system.md
```

---

## Documentation Maintenance

### When to Update Documentation

1. **New Feature Added**
   - Add user workflows
   - Add test scenarios
   - Update architecture overview
   - Create ADR if significant decision

2. **Feature Modified**
   - Update user workflows if behavior changes
   - Update test scenarios
   - Update architecture docs if structure changes

3. **Bug Fix**
   - Update test scenarios if new edge case discovered
   - Update user workflows if behavior clarified

4. **Refactoring**
   - Update architecture docs if structure changes
   - ADR if architectural pattern changes

### Review Cadence

- **Weekly**: Check test scenarios match e2e tests
- **Monthly**: Review architecture docs for accuracy
- **Quarterly**: Review all docs for completeness
- **Per Epic**: Update docs when epic is implemented

---

## Migration Plan

### Phase 1: Consolidate Existing Docs ⏳

1. **Move epic files** from `/docs/roadmap/` to `/docs/roadmap/epics/`
2. **Extract content** from `/docs/ux_architecture/` to:
   - User-facing behavior → `/docs/user-interactions/`
   - Technical architecture → `/docs/architecture/`
3. **Extract content** from `/docs/md/` to:
   - Engine docs → `/docs/architecture/02-formula-engine.md`
   - Parser docs → Same

### Phase 2: Fill High-Priority Gaps ⏳

1. Create **formula-building.scenarios.md** (next e2e tests)
2. Create **architecture/01-mode-system.md** (coding agent context)
3. Create **api-reference/rest-api.md** (API contract)

### Phase 3: Complete Test Scenarios ⏳

1. navigation.scenarios.md
2. selection-clipboard.scenarios.md
3. history.scenarios.md

### Phase 4: Complete Architecture Docs ⏳

1. architecture/02-formula-engine.md
2. architecture/03-ui-components.md
3. architecture/04-history-system.md
4. architecture/05-file-persistence.md

### Phase 5: Complete ADRs ⏳

1. adr/002-web-worker-engine.md
2. adr/003-command-pattern-history.md

---

## Success Metrics

### For Coding Agents
- ✅ Can understand component boundaries without reading code
- ✅ Know where to add new features based on docs alone
- ✅ Understand data flow between subsystems

### For E2E Test Design
- ✅ Every user workflow has a test scenario
- ✅ All mode transitions are tested
- ✅ Edge cases are documented and tested

### For Architecture Analysis
- ✅ New developers understand system in 30 minutes
- ✅ Architecture decisions are clear and justified
- ✅ Extension points are obvious

---

## Document Ownership

### Primary Maintainer
- Product/Engineering team

### Update Triggers
- Feature implementation (update user workflows, test scenarios)
- Architecture changes (update architecture docs, create ADR)
- Bug fixes revealing edge cases (update test scenarios)

### Review Process
- PRs that add features SHOULD update relevant docs
- Quarterly documentation review
- Keep docs in sync with code

---

## Tools and Automation

### Recommended Tools
- **Markdown linter**: Ensure consistent formatting
- **Link checker**: Verify cross-references work
- **Document generator**: Consider auto-generating API docs from code comments

### Future Enhancements
- **Diagram generation**: Mermaid diagrams for architecture
- **Test coverage mapping**: Link test scenarios to actual tests
- **Documentation CI**: Fail builds if docs are missing for new features

---

## Examples of Good Documentation

### User Workflow Example
See: `/docs/user-interactions/01-core-workflows.md` - Workflow #3 "Arrow Key Commits in EnterMode"

**Why it's good**:
- Clear step-by-step flow
- Visual feedback described
- System state changes noted
- Key behavior highlighted

### Test Scenario Example
See: `/docs/test-scenarios/data-entry.scenarios.md` - Scenario 3.1 "Arrow Right commits and moves"

**Why it's good**:
- Clear Given-When-Then
- Playwright code included
- Assertions are specific
- Independent scenario

### Architecture Example
See: `/docs/architecture/00-system-overview.md` - Component Responsibilities

**Why it's good**:
- One-liner per component
- Clear "what it does" vs "what it doesn't do"
- Data flow diagrams
- High-level, not implementation

### ADR Example
See: `/docs/adr/001-fsm-mode-system.md`

**Why it's good**:
- Clear problem statement
- Alternatives considered with reasons for rejection
- Balanced consequences (positive and negative)
- Validation with stress tests

---

## FAQ

### Q: Should we document every function in architecture docs?
**A**: No. Architecture docs are high-level. Focus on component responsibilities and data flows. Code comments should document individual functions.

### Q: How detailed should test scenarios be?
**A**: Detailed enough to translate directly to Playwright tests. Include expected visual feedback and state changes.

### Q: When should we create a new ADR?
**A**: When making a significant architectural decision that:
- Affects multiple components
- Has trade-offs worth documenting
- Future developers would ask "why did we do it this way?"

### Q: What if existing docs are outdated?
**A**: Update them! Documentation debt is technical debt. If behavior changed, docs must reflect that.

### Q: Should we duplicate information across docs?
**A**: Minimize duplication, but some overlap is OK. Use cross-references. Each doc serves a different audience with different needs.

---

## Quick Start for New Docs

### To Add a User Workflow:
1. Copy template from "User-Interactions Document Template"
2. Fill in step-by-step flow table
3. Add mode transition diagram
4. Link to related test scenarios

### To Add a Test Scenario:
1. Copy template from "Test Scenario Document Template"
2. Write Given-When-Then
3. Add Playwright implementation
4. Link to user workflow

### To Document a Component:
1. Copy template from "Architecture Document Template"
2. Focus on responsibilities and data flow
3. Keep it high-level
4. Link to user docs and ADRs

### To Create an ADR:
1. Copy template from "ADR Template"
2. Explain the problem first
3. List alternatives with rejection reasons
4. Balance pros and cons
5. Add validation

---

## Conclusion

This documentation structure is designed to grow with v-sheet while maintaining clarity for all three audiences: coding agents, test designers, and architecture analysts.

**Key Principle**: Documentation should bridge the user perspective with technical implementation, emphasizing user-facing detail while keeping technical docs high-level.

**Next Steps**:
1. Use this guide when creating new documentation
2. Follow templates for consistency
3. Cross-reference related documents
4. Update docs when code changes
5. Review quarterly for accuracy

---

**Document Status**: ✅ Complete and Active

**Last Updated**: 2025-12-07

**Next Review**: 2026-03-07 (quarterly)
