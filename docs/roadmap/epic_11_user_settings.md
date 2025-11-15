Here is the PRD for Epic 11: User Settings.

---

# PRD: Epic 11: User Settings

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 3 (Cell Formatting) - _Specifically, a "Number Formatting" sub-epic is a hard dependency._

---

## 1\. Overview

This document outlines the requirements for "User Settings," a feature that allows users to personalize their v-sheet environment. This epic introduces a settings panel and a persistence layer for user preferences, enabling users to define application defaults (like preferred currency and date formats) to streamline their workflow.

---

## 2\. Problem Statement

- **Problem:** The application is "one-size-fits-all." All defaults are hardcoded. A user in Europe must manually re-format every date to `DD/MM/YYYY`, and a user in Japan must manually change every price to `¥`.
- **Impact:** This creates repetitive, unnecessary work ("format friction") and makes the application feel rigid and not adapted to the user's regional or personal needs.
- **Current State:** The application has no concept of user-specific settings. The backend has a `metadata.json` for the _last-opened file_, but no storage for _user preferences_.

---

## 3\. Goals & Objectives

- **User Goal:** "I want to set my preferred currency and date format _once_ and have the application use them as the default for all my sheets."
- **Product Goal:** To increase user efficiency and satisfaction by making the application adapt to their personal and regional preferences.
- **Technical Goal:** To create a new persistence layer for user-level settings (distinct from file-level data) and integrate these settings as the "base layer" for the cell formatting system.

---

## 4\. Scope

### In Scope

- **Settings Persistence:** A new, simple, server-side storage for user-level preferences (e.g., a `user_settings.json` file managed by `app.py`).
- **Settings UI:** A new "Settings" modal, accessible from the main file dropdown menu.
- **V1 Settings:**
  - **Default Currency:** A dropdown to select a default currency (e.g., `USD ($)`, `EUR (€)`, `JPY (¥)`).
  - **Default Date Format:** A dropdown to select a default date format (e.g., `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`).
- **Formatting Integration:** These settings will provide the _default_ behavior for the Number Formatting engine (from the Cell Formatting epic). For example, typing `100` and clicking the "Currency" button in the toolbar should apply the user's _preferred_ currency, not a hardcoded one.
- **Data-Entry TBD (low-priority):** (Optional) Investigate auto-formatting. Typing `10/12/2025` should be automatically recognized and formatted as a date according to the user's preference.

### Out of Scope (For This Epic)

- **Full User Accounts:** This epic does _not_ include user login, authentication, or registration. The server-side settings will be "global" for the single user of the instance.
- **File-Specific Settings:** This epic is for _global_ user defaults, not settings for a single file.
- **Cosmetic Settings:** Themes (dark/light mode), font family defaults, or UI language localization are out of scope for V1.
- **The Number Formatting Engine Itself:** This epic _consumes_ the number formatting engine (built in Epic 3); it does not _build_ it.

---

## 5\. User Stories

- **As a user,** I want to go to a "Settings" menu and select "Euro (€)" as my default currency.
- **As a user,** after setting my default, I want to type `123` in a cell and click the "Format as Currency" button, and see it become `€123.00`.
- **As a user,** I want to set my preferred date format to "DD/MM/YYYY".
- **As a user,** I want to type "10/12/25" in a cell, and have the application recognize it and display it as "10/12/2025".
- **As a user,** if I set a _specific_ format on a cell (e.g., "USD"), I expect that to override my default "EUR" setting for that cell.

---

## 6\. Functional Requirements

| ID        | Requirement                   | Description                                                                                                                                                                                                                                                        |
| :-------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **UI: Settings Menu**         | A "Settings..." option must be added to the file dropdown menu in `formula-bar.js`.                                                                                                                                                                                |
| **FR1.2** | **UI: Settings Modal**        | A new "Settings" modal must be added to `index.html`. It will contain dropdowns for the in-scope V1 settings.                                                                                                                                                      |
| **FR2.1** | **Backend: Settings API**     | `server/app.py` must be modified to add two new routes: <br> - `GET /api/settings`: Fetches the user settings. <br> - `PUT /api/settings`: Overwrites the user settings.                                                                                           |
| **FR2.2** | **Backend: Settings Storage** | `app.py` will store these settings in a new file, `data/user_settings.json`, separate from file data.                                                                                                                                                              |
| **FR3.1** | **Client: Settings Service**  | `file-manager.js` (or a new `SettingsManager.js`) must be created/updated to: <br> 1. Fetch settings on application load. <br> 2. Provide settings to other components (like `spreadsheet.js`). <br> 3. Call `PUT /api/settings` when the user saves in the modal. |
| **FR3.2** | **Integration: Formatting**   | `spreadsheet.js` and the "Cell Formatting" (Epic 3) toolbar logic must be updated. When a user clicks "Format as Currency," the toolbar must check the `SettingsManager` for the default currency and apply that format.                                           |
| **FR3.3** | **Formatting Priority**       | The rendering engine must obey a clear priority: <br> 1. Cell-specific format (e.g., `style: { numberFormat: "USD" }`) <br> 2. User default format (e.g., `EUR`) <br> 3. System default (e.g., `RAW`)                                                              |

---

## 7\. Non-Functional Requirements

| ID       | Type            | Requirement                                                                                                                                                |
| :------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Persistence** | Settings must be saved immediately on the server and be re-loaded on the next page visit.                                                                  |
| **NFR2** | **Testability** | The logic for applying default formats must be unit-tested. E2E tests must verify that changing a setting and clicking a format button works as expected.  |
| **NFR3** | **Dependency**  | This epic is **blocked** by the implementation of a "Number Formatting" engine in "Epic 3: Cell Formatting." This PRD is invalid until that engine exists. |

---

## 8\. High-Level Implementation Plan

1.  **Phase 1: Backend API**
    - Add the new `user_settings.json` file.
    - Implement the `GET` and `PUT` routes in `server/app.py` to manage this file.
2.  **Phase 2: Client Service**
    - Create a `SettingsManager.js` service.
    - Implement `loadSettings()` (called on app start) and `saveSettings(newSettings)`.
    - Expose the loaded settings (e.g., `SettingsManager.get('defaultCurrency')`).
3.  **Phase 3: UI**
    - Add the "Settings" button to the file menu.
    - Build the "Settings" modal in `index.html`.
    - Wire the modal's "Save" button to `SettingsManager.saveSettings()`.
4.  **Phase 4: Integration**
    - This assumes the "Number Formatting" engine from Epic 3 is done.
    - Refactor the "Format as Currency" button (from Epic 3) to:
      1.  `const currency = SettingsManager.get('defaultCurrency') || 'USD';`
      2.  `const command = new FormatRangeCommand(selection, { type: 'currency', symbol: currency });`
      3.  `HistoryManager.execute(command);`
5.  **Phase 5: Testing**
    - Add E2E tests:
      1.  Default state (USD). Click format button, see `$`.
      2.  Change setting to EUR. Click format button, see `€`.
      3.  Reload page. Click format button, confirm it's still `€`.

---

## 9\. Success Metrics

- All user stories are demonstrable.
- **Persistence:** A user can set their default currency to `EUR`, reload the entire application, and the `EUR` setting is still active.
- **Priority:** A user with `EUR` default can apply a `USD` format to cell `A1`, and `A1` will correctly show `USD` while `A2` (formatted as currency) will show `EUR`.
- **Test Coverage:** All new API routes and the `SettingsManager` are unit-tested. E2E tests pass.

---

## 10\. Open Questions & Risks

- **Risk: Hard Dependency.** This epic is 100% blocked by the (very large) "Number Formatting" feature. It _must_ be scheduled after it.
- **Risk: "User" Identity.** Without user accounts, the "user setting" is really an "instance setting" or "browser setting."
  - **Mitigation:** This is fine for V1. The `user_settings.json` on the server will apply to _anyone_ accessing that server instance. This is acceptable for the project's current state.
- **Risk: Scope Creep.** Users will immediately ask for "default font" or "theme."
  - **Mitigation:** We must be firm that V1 is only about the _number and date_ formatting defaults, as these are the most critical for data analysis.
