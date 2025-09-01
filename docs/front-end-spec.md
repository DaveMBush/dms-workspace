# Front-end UX Specification

## **UI/UX Specification**

- **Project Title**: Universe Update Process Enhancement
- **Agent**: @ux

---

### **1. User Flow**

The user flow for updating the universe will be streamlined to a single-step action within the modal dialog.

1. The user navigates to the screen that contains the "Update Universe" modal dialog.
2. The user clicks a button to open the dialog.
3. The modal dialog appears, now without the manual symbol input fields.
4. The "Update Universe" button is no longer disabled and is immediately clickable.
5. The user clicks the "Update Universe" button to trigger the process.
6. The modal dialog closes upon a successful API call, and the application's universe of CEFs is updated in the backend.

---

### **2. UI Changes**

The primary change to the user interface involves simplifying the modal dialog.

- **Removal of Elements**: The input fields for symbols (equities, income, and tax-free) will be removed from the modal dialog. This simplifies the dialog's appearance and interaction model.
- **Button State**: The "Update Universe" button will be enabled by default when the dialog loads. It will no longer depend on the symbol input fields to be in a valid state.
- **Modal Buttons**: The other existing buttons in the modal will be retained.

---

### **3. Behavioral Requirements**

The "Update Universe" button's behavior will be modified to reflect the new backend logic:

- **API Call**: When the "Update Universe" button is clicked, it will initiate a request to the server.
- **No Payload**: The frontend will no longer send a list of symbols in the API request payload. The request will be triggered by a simple button click.
- **Server-Side Data Source**: The server-side code is responsible for retrieving the symbols directly from the screener database table and filtering them based on the true boolean fields, as described in the PRD.

---

### **4. Loading and Error States**

- Loading
  - While the update request is in flight, show a spinner inside the dialog.
  - Disable action buttons during the request.
- Error
  - On failure, keep the dialog open and show an inline error message (non-blocking) with retry guidance.
  - Provide a retry button; re-enable all actions when the request settles.
- Success
  - On success, close the dialog and refresh the relevant stores/data.

---

### **5. Notifications**

- Success toast (non-intrusive): "Universe updated from Screener"
- Error toast: concise failure reason; link to logs if available.

---

### **6. Accessibility (PrimeNG + Tailwind)**

- Focus management
  - Focus the first actionable element when the dialog opens.
  - Return focus to the triggering button on close.
- Keyboard
  - Ensure Esc closes the dialog; Tab order is logical and trapped inside.
  - Buttons are reachable and clearly labeled.
- ARIA
  - Dialog uses role=dialog and has aria-labelledby bound to the header.
  - Spinner has aria-live=polite, and error text is announced.
- Contrast
  - Buttons and text follow WCAG AA contrast.

---

### **7. Feature flag visibility**

- When `USE_SCREENER_FOR_UNIVERSE=false` (default), hide or disable the "Use Screener" action if present.
- Manual symbol fields remain visible and functional when the flag is off.

---

### **8. Edge cases**

- No eligible Screener rows
  - Show success toast with note: "No symbols qualified; nothing changed".
- Partial updates (network/API hiccups)
  - Show error; allow retry. Do not close the dialog automatically.
- Timeout
  - Show timeout error with retry. Keep the dialog open.
- Backend validation error
  - Show inline message; do not clear user context (keep dialog state).
