Here is the PRD for Epic 2: Testing & Logging (Bootstrap).

---

# PRD: Epic 2: Testing & Logging (Bootstrap)

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team

---

## 1. Overview

This document outlines the requirements for establishing a foundational testing and logging framework for the v-sheet application. The project currently has no automated tests, making every new feature or refactor a high-risk activity. This epic will create the "bootstrap" infrastructure for unit testing, end-to-end (E2E) testing, and standardized logging. This will de-risk future development and forms the basis for our new policy: "no new feature without tests."

---

## 2. Problem Statement

- **Problem:** The codebase has 0% automated test coverage. All testing is manual.
- **Impact:**
  1.  **High Risk of Regression:** A change in one file (e.g., `DependencyGraph.js`) could silently break formula calculations, and we wouldn't know until a user reports it.
  2.  **Slow Development:** Developers must manually re-test all features after every change, which is slow and error-prone.
  3.  **Difficult Debugging:** Debugging relies on manual `console.log` statements, which are inconsistent and often left in production code.
- **Current State:** The application is a complex, multi-threaded system with a parser, evaluator, and dependency graph, all of which are untested.

---

## 3. Goals & Objectives

- **User Goal (Indirect):** A more stable, reliable, and bug-free application. Users will encounter fewer issues and have more confidence in their data.
- **Product Goal:** To significantly increase product quality, reduce regressions, and create a stable platform for future feature development (like Undo/Redo and Formatting).
- **Developer/Technical Goal:**
  1.  To create a fast, easy-to-use testing framework that developers can run with a single command (`npm test`).
  2.  To make adding new tests for new features a simple, low-friction process.
  3.  To establish a standardized logging utility to replace ad-hoc `console.log` calls.

---

## 4. Scope

### In Scope

- **Framework Setup:**
  - Select, install, and configure a **Unit Test framework** (e.g., Vitest, Jest).
  - Select, install, and configure an **E2E Test framework** (e.g., Playwright, Cypress).
  - Add a `test` script to `package.json`.
- **Initial Unit Tests:**
  - Create tests for the "pure" formula engine components:
    - `Tokenizer.js`: Test tokenizing various formulas (e.g., `A1+B2`, `"hello"`, `5.5`).
    - `Parser.js`: Test that the parser correctly builds an AST for different inputs, respecting operator precedence.
    - `Evaluator.js`: Test all binary operators (`+`, `-`, `*`, `/`, `&`, `=`, `>`, etc.).
    - `DependencyGraph.js`: Critically, test the circular reference detection logic (`checkForCircularReference`) and recalculation order (`getRecalculationOrder`).
  - Create tests for sample formula functions: `SUM` and `IF`.
- **Initial E2E Tests:**
  - **Critical Path 1 (Load):** Test that the page loads, fetches the recent file from the backend, and correctly displays data in cell `A1`.
  - **Critical Path 2 (Recalc):** Test the full _recalculation loop_:
    1.  Set `A1` to `5`.
    2.  Set `B1` to `10`.
    3.  Set `C1` to `=A1+B1`.
    4.  Assert that `C1` displays `15`.
    5.  Set `A1` to `20`.
    6.  Assert that `C1` automatically updates to `30`.
- **Logging Utility:**
  - Create a simple `Logger.js` utility that wraps `console.log`, `console.warn`, etc., and can be enabled/disabled by a global "debug" flag.

### Out of Scope (For This Epic)

- **100% Test Coverage:** The goal is to build the framework and test _critical_ components, not to achieve 100% coverage immediately.
- **CI/CD Integration:** Setting up GitHub Actions or another CI pipeline to run these tests automatically is a follow-up task.
- **Backend API Tests:** This epic will focus on the JavaScript application. API integration tests for the Flask server are a separate task.
- **Testing Every Feature:** We will _not_ write tests for resizing, dragging, file management, etc., in this epic. Those tests will be added _as part of those future epics_.

---

## 6. User Stories

_(The "user" for this epic is primarily the developer)_

- **As a developer,** I want to run a single command (`npm test`) from my terminal to verify that I haven't broken any core formula logic.
- **As a developer,** I want to see a clear "pass" or "fail" report so I know instantly if my change is safe to commit.
- **As a developer,** when I create a new formula function (e.g., `AVERAGE`), I want to easily add a new test file (`average.test.js`) to verify it works.
- **As a developer,** I want a reliable E2E test to prove that the full application loop (UI -> Worker -> Engine -> UI) is working.
- **As a developer,** I want to use a standardized `Logger.warn()` method for warnings instead of `console.log()` so that our debugging output is consistent and can be disabled in production.

---

## 7. Functional Requirements

| ID        | Requirement               | Description                                                                                                                                                    |
| :-------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **Test Runner (Unit)**    | A JavaScript unit test framework (e.g., Vitest) must be installed and configured.                                                                              |
| **FR1.2** | **Test Runner (E2E)**     | An E2E test framework (e.g., Playwright) must be installed and configured to run against the application.                                                      |
| **FR1.3** | **Test Script**           | A script `npm test` must be added to `package.json` that runs all unit tests. A separate `npm run e2e` script should run the E2E tests.                        |
| **FR2.1** | **Unit Tests: Engine**    | Unit tests must be written to cover the basic functionality of `Tokenizer.js`, `Parser.js`, `Evaluator.js`, and `DependencyGraph.js`.                          |
| **FR2.2** | **Unit Tests: Functions** | Unit tests must be written for `SUM` and `IF` to prove the function test harness works.                                                                        |
| **FR3.1** | **E2E Test: Load**        | An E2E test must load the application and assert that data is correctly loaded into the grid from the backend.                                                 |
| **FR3.2** | **E2E Test: Recalc Loop** | An E2E test must simulate a user typing values and a formula (`=A1+B1`) and assert that the formula cell updates correctly when a precedent (`A1`) is changed. |
| **FR4.1** | **Logging Utility**       | A `Logger.js` utility must be created. It should provide methods (`log`, `warn`, `error`) and be controllable by a global debug flag.                          |

---

## 8. Non-Functional Requirements

| ID       | Type                | Requirement                                                                                                                                                                                     |
| :------- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance**     | The entire unit test suite must complete in under 10 seconds.                                                                                                                                   |
| **NFR2** | **Isolation**       | Tests must be atomic and independent. They must not depend on each other, and the failure of one test must not prevent others from running.                                                     |
| **NFR3** | **Maintainability** | The testing framework must be easy to extend. Adding a new unit test for a new function should not require any configuration changes.                                                           |
| **NFR4** | **Policy**          | (Policy, not code) From this epic forward, all new epics (like "Undo/Redo" and "Formatting") **must** include their own corresponding unit and/E2E tests as part of their "definition of done." |

---

## 9. High-Level Implementation Plan

1.  **Research & Decide:** Choose the test frameworks (e.g., Vitest for unit tests due to its speed and ES6 module support; Playwright for E2E tests due to its robust "auto-wait" features).
2.  **Install & Configure:** Add frameworks to `package.json`, create config files (e.g., `vitest.config.js`), and add the `test` and `e2e` scripts.
3.  **Create Logger:** Create the `Logger.js` utility and refactor one or two key files (e.g., `FormulaEngine.js`) to use it.
4.  **Write Unit Tests:** Create test files (e.g., `Tokenizer.test.js`, `Parser.test.js`, `Evaluator.test.js`, `DependencyGraph.test.js`) and populate them with the "In Scope" test cases.
5.  **Write E2E Tests:** Create the test files for the two "Critical Path" E2E tests.
6.  **Document:** Briefly document in the `README.md` how to run the tests.

---

## 10. Success Metrics

- Running `npm test` executes the unit test suite and all tests pass.
- Running `npm run e2e` launches the browser, runs the two critical path tests, and all tests pass.
- The core engine components (`Tokenizer`, `Parser`, `Evaluator`, `DependencyGraph`) all have measurable, non-zero test coverage.
- The new `Logger.js` utility is successfully used in at least one engine file.

## 11. Open Questions & Risks

- **Risk:** The existing code may be tightly coupled, making it difficult to unit test.
  - **Mitigation:** Be prepared to perform minor refactoring (e.g., exporting functions, providing mockable dependencies) to make the code testable.
- **Risk:** E2E tests can be "flaky" (i.e., randomly fail due to timing).
  - **Mitigation:** Choose a modern framework like Playwright that has robust auto-waiting. Avoid using `setTimeout` in tests; rely on element assertions.
- **Risk:** Developers may not adopt the logging utility.
  - **Mitigation:** Make it trivially easy to import and use. Lead by example by refactoring key files to use it.
