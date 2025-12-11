Here is the final PRD for Epic 10, updated with your changes.

---

# PRD: Epic 10: Function Library Expansion (Revised)

- **Status:** Final
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 2 (Testing & Logging)

---

## 1. Overview

This document outlines the requirements for expanding the v-sheet formula engine's library of built-in functions. A spreadsheet's power is directly proportional to its "vocabulary" of functions. This epic adds a critical mass of common Math, Text, Logical, and Lookup functions, transforming the application from a simple calculator into a genuinely useful tool for data analysis and manipulation.

---

## 2. Problem Statement

- **Problem:** The formula engine is extremely limited. It only supports `SUM` and `IF`.
- **Impact:** Users cannot perform even the most basic data analysis. It's impossible to average a column, sum based on a condition, or look up a value from a table. This is a severe functional gap that blocks almost all real-world use cases.
- **Current State:** The `FunctionRegistry` and `register.js` files are built to be extensible, but they only contain two functions.

---

## 3. Goals & Objectives

- **User Goal:** "I want to be able to use the common functions I know from Excel and Google Sheets, like `AVERAGE`, `VLOOKUP`, `SUMIF`, and `SUMPRODUCT`."
- **Product Goal:** To significantly expand the analytical power of the formula engine to cover the 20% of functions that solve 80% of common user problems.
- **Technical Goal:** To create a scalable process for adding new, robust, and performant function modules, ensuring each new function is fully unit-tested and properly integrated with the `Evaluator`'s type coercion and error-handling systems.

---

## 4. Scope

### In Scope

- **New Function Modules:** Create new files for `text.js` and `lookup.js`, and add to the existing `math.js` and `logical.js`.
- **New Math Functions:**
  - `AVERAGE`
  - `COUNT` (counts only numbers)
  - `COUNTA` (counts non-empty cells)
  - `MAX`
  - `MIN`
  - `ROUND`
  - **`SUMIF`**
  - **`SUMPRODUCT`**
- **New Logical Functions:**
  - `AND`
  - `OR`
  - `NOT`
- **New Text Functions:**
  - `LEFT`
  - `RIGHT`
  - `MID`
  - `LEN`
  - `UPPER`
  - `LOWER`
  - `TRIM`
  - `CONCATENATE` (or `CONCAT`)
- **New Lookup Function:**
  - `VLOOKUP` (V1 will only support exact match, i.e., `FALSE` as the 4th argument).
- **Infrastructure:** Update `register.js` to import and register all new functions with the `FunctionRegistry`.
- **Testing (Policy from Epic 2):** Every single new function _must_ be accompanied by a comprehensive unit test file.

### Out of Scope (For This Epic)

- **Date/Time Functions:** (e.g., `TODAY`, `EOMONTH`).
- **Financial Functions:** (e.g., `PMT`, `NPV`, `IRR`).
- **Advanced Lookup/Dynamic Arrays:** (e.g., `XLOOKUP`, `INDEX`, `MATCH`, `FILTER`, `UNIQUE`, `SORT`).
- **Advanced Stats:** (e.g., `STDEV`, `VAR`, `COUNTIF`, `SUMIFS`, `AVERAGEIF`).
- **UI:** This is a "headless" engine epic. No UI changes will be made, other than the functions now being available for use in formulas.

---

## 5. User Stories

- **As a user,** I want to type `=AVERAGE(A1:A10)` to get the average of a range of numbers.
- **As a user,** I want to type `=VLOOKUP(A1, Sheet2!A:C, 2, FALSE)` to find a value from another table.
- **As a user,** I want to type `=LEFT(A1, 5)` to extract the first 5 characters from a cell.
- **As a user,** I want to type `=IF(AND(A1>10, B1="Yes"), "OK", "Error")` to perform a multi-conditional check.
- **As a user,** I want to type `=TRIM(UPPER(A1))`, to clean up text data.
- **As a user,** I want to type `=SUMIF(A1:A10, ">50")` to sum only the cells in a range that meet my criteria.
- **As a user,** I want to type `=SUMPRODUCT(A1:A10, B1:B10)` to get the sum of the products of two columns.

---

## 6. Functional Requirements

| ID        | Requirement                 | Description                                                                                                                                                                                                           |
| :-------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **New Modules**             | Create `js/engine/functions/text.js` and `js/engine/functions/lookup.js`.                                                                                                                                             |
| **FR1.2** | **Module Registration**     | Update `js/engine/functions/register.js` to import and register all new functions (listed in Scope) with the `FunctionRegistry`.                                                                                      |
| **FR2.1** | **Evaluator Context**       | All functions must be implemented as `function(...) { ... }` (not arrow functions) to correctly receive the `Evaluator`'s context via `this`.                                                                         |
| **FR2.2** | **Type Coercion**           | All functions _must_ use `this.coerce.toNumber`, `this.coerce.toString`, etc., for all arguments to ensure they handle different data types (e.g., text, booleans) correctly and consistently.                        |
| **FR2.3** | **Error Handling**          | Functions must return or throw appropriate formula errors (e.g., `NumError`, `NotAvailableError`, `ValueError`) when given invalid inputs, as defined in `FormulaErrors.js`.                                          |
| **FR2.4** | **Range Handling**          | Functions that accept ranges (like `AVERAGE`, `MAX`) must be built to correctly flatten and iterate array arguments (e.g., from `A1:B10`).                                                                            |
| **FR3.1** | **Math Implementations**    | `AVERAGE`, `COUNT`, `COUNTA`, `MAX`, `MIN`, `ROUND`, `SUMIF`, and `SUMPRODUCT` must be implemented in `math.js`.                                                                                                      |
| **FR3.2** | **Logical Implementations** | `AND`, `OR`, `NOT` must be implemented in `logical.js`.                                                                                                                                                               |
| **FR3.3** | **Text Implementations**    | `LEFT`, `RIGHT`, `MID`, `LEN`, `UPPER`, `LOWER`, `TRIM`, `CONCATENATE` must be implemented in `text.js`.                                                                                                              |
| **FR3.4** | **Lookup Implementations**  | `VLOOKUP` must be implemented in `lookup.js`.                                                                                                                                                                         |
| **FR3.5** | **`VLOOKUP` Scope**         | The V1 implementation of `VLOOKUP` will only support exact match (the 4th argument, `range_lookup`, must be `FALSE`). Approximate match is out of scope.                                                              |
| **FR3.6** | **`SUMIF` Scope**           | The `SUMIF` implementation must support both the 2-argument (`range`, `criteria`) and 3-argument (`criteria_range`, `criteria`, `[sum_range]`) forms. It must support simple criteria (e.g., `5`, `">10"`, `"Text"`). |
| **FR4.1** | **Testing**                 | Per Epic 2, _every_ new function must have a corresponding unit test file (e.g., `average.test.js`, `sumif.test.js`) that covers its main use cases, edge cases, and error conditions.                                |

---

## 7. Non-Functional Requirements

| ID       | Type            | Requirement                                                                                                                                                                                                                   |
| :------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance** | Complex functions like `VLOOKUP`, `SUMIF`, and `SUMPRODUCT` on large, unsorted ranges (e.g., 10,000+ rows) must be performant and not block the worker thread for an unreasonable time.                                       |
| **NFR2** | **Accuracy**    | Function behavior must be benchmarked against and identical to Google Sheets/Excel. This includes subtle "edge case" behaviors (e.g., "How does `AVERAGE` treat a blank cell?" "How does `SUMIF` parse a `">="` criterion?"). |
| **NFR3** | **Scalability** | The new module structure (`text.js`, `lookup.js`) must serve as a clean template for future expansion (e.g., `financial.js`, `date.js`).                                                                                      |

---

## 8. High-Level Implementation Plan

1.  **Phase 1: Setup & Scaffolding**
    - Create the new files: `js/engine/functions/text.js` and `js/engine/functions/lookup.js`.
    - Create the corresponding test files (e.g., `text.test.js`, `lookup.test.js`, `sumif.test.js`, `sumproduct.test.js`).
    - Update `register.js` to import from these new files.
2.  **Phase 2: Implement Simple Functions (TDD)**
    - For each simple function (e.g., `LEN`, `UPPER`, `AND`, `NOT`):
      1.  Write a unit test for it (this will fail).
      2.  Implement the function, using `this.coerce`.
      3.  Run the test (it should pass).
      4.  Add tests for edge cases (blanks, errors, etc.).
3.  **Phase 3: Implement Aggregate Functions (TDD)**
    - For each aggregate function (e.g., `AVERAGE`, `MAX`, `COUNTA`):
      1.  Write unit tests that pass single values, 1D arrays, and 2D arrays.
      2.  Write tests for correct type coercion (e.g., `AVERAGE` must ignore text).
      3.  Implement the function, ensuring it flattens range arguments and uses `this.coerce` correctly.
4.  **Phase 4: Implement Complex Functions (TDD)**
    - This is the most complex phase.
    - **`VLOOKUP`**: Write tests for success, `#N/A` fail, and `#REF!` fail. Implement the linear scan for exact match (`FALSE`).
    - **`SUMIF`**: Write tests for 2-arg and 3-arg forms, and for various criteria (`5`, `">10"`, `"Text"`). Implement the function.
    - **`SUMPRODUCT`**: Write tests for matching 1D arrays, 2D arrays (e.g., `A1:B2`, `C1:D2`), and mismatched array sizes (should return `#VALUE!`). Implement the function.
5.  **Phase 5: Manual & E2E Testing**
    - Manually verify all functions in the UI.
    - Add a new E2E test that uses a combination of the new functions (e.g., `IF(AVERAGE(...) > 10, SUMIF(...), VLOOKUP(...))`) to ensure they work together.

---

## 9. Success Metrics

- All new functions (listed in Scope) are implemented, registered, and callable from the UI.
- **Test Coverage:** The `js/engine/functions/` directory has >90% unit test coverage.
- **Accuracy:** All new functions produce results identical to their Google Sheets counterparts for a standard set of inputs.
- **Composition:** Functions can be successfully nested and combined (e.g., `UPPER(VLOOKUP(...))`).

---

## 10. Open Questions & Risks

- **Risk: Behavioral Inaccuracy.** The #1 risk is subtle behavioral differences from Excel/GSheets. `SUMIF` criteria parsing (`">"&A1`) and `SUMPRODUCT`'s handling of text/booleans are notoriously complex.
  - **Mitigation:** TDD is the only solution. Each function's tests must be written _after_ researching its exact behavior on Google Sheets (the simpler benchmark).
- **Risk: `VLOOKUP` Complexity.** The "approximate match" (`TRUE`) argument is complex.
  - **Mitigation:** We have explicitly de-scoped this for V1 (FR3.5).
- **Risk: Scope Creep.**
  - **Mitigation:** We have successfully added `SUMIF` and `SUMPRODUCT`. We must now be firm in holding `COUNTIF`, `SUMIFS` (plural), and `AVERAGEIF` for a future "Conditional Aggregation II" epic.
- **Risk: `SUMIF` Criteria Parser.** The logic to parse the `criteria` string (`">10"`) will essentially be a mini-parser itself.
  - **Mitigation:** This logic must be isolated in its own helper function and heavily unit-tested.
