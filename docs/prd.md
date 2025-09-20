Here is the finalized Product Requirements Document (PRD) for your project.

## **Product Requirements Document (PRD)**

- **Project Title**: Enhancement to the Universe Update Process

---

## **1. Introduction**

This PRD outlines the requirements for a brownfield enhancement to the existing application. The goal is to modernize the process for updating the universe of tradable Closed End Funds (CEFs) by replacing the manual symbol input fields with an automated process that leverages the results of the Screener. This enhancement will streamline the user workflow and improve efficiency while retaining the existing dialog functionality.

---

## **2. Problem Statement**

The current method for updating the universe of CEFs relies on a manual modal dialog where the user must input a list of symbols. This process is inefficient, prone to manual error, and disconnected from the Screener functionality, which already provides a filtered list of potential CEFs.

---

## **3. Proposed Solution**

The manual symbol input fields on the modal dialog will be removed. The universe of tradable CEFs will now be updated automatically based on the results of the "Screener" screen. The buttons on the modal dialog, including the one that triggers the universe update, will remain in place.

The specific requirements for this solution are:

- The system will access the screener database table.
- It will identify all entries in the table where the three boolean fields are set to true.
- The symbol from each of these identified entries will be used to populate and update the universe of tradable CEFs.
- The existing functionality that consumes the universe (e.g., the trading screen) must be updated to use this new data source.

---

## **4. ETF Universe Management**

Beyond the screener-driven CEF universe, the application needs to support trading symbols that are not part of that universe, primarily ETFs. Users require the ability to add symbols directly to the universe via the Universe screen, with proper flagging to distinguish between closed-end funds and other symbol types to prevent incorrect expiration during screener synchronization.

**Requirements for ETF Management:**

- Add capability to manually insert symbols into the universe through the UI
- Implement database flag (`is_closed_end_fund`) to distinguish between screener-derived CEFs and manually-added symbols
- Ensure manually-added symbols (ETFs) are not marked as expired during screener-to-universe sync operations
- Maintain all existing functionality for CEF universe management from screener data

---

## **5. Target Audience**

This enhancement is intended for the application's sole user, the product owner and developer, for personal use.

---

## **5. Technical Requirements & Constraints**

- **Frontend**: The frontend code for this enhancement must be written in **Angular 20** using **signals**. The use of **RxJS should be avoided**. The user interface will leverage the existing **PrimeNG component library** and **Tailwind CSS** for styling and layout.
- **Backend**: The backend services must integrate with the existing stack, which uses the **Prisma ORM framework** with **Sqlite3** and the **better-sqlite3** driver. The API interface is built with the **Fastify framework**.
- **General**: All new and modified code must strictly adhere to the project's established **lint rules** for both the frontend and backend.

---
