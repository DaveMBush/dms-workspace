---

### **UI/UX Specification**

* **Project Title**: Universe Update Process Enhancement
* **Agent**: @ux

---

### **1\. User Flow**

The user flow for updating the universe will be streamlined to a single-step action within the modal dialog.

1. The user navigates to the screen that contains the "Update Universe" modal dialog.
2. The user clicks a button to open the dialog.
3. The modal dialog appears, now without the manual symbol input fields.
4. The "Update Universe" button is no longer disabled and is immediately clickable.
5. The user clicks the "Update Universe" button to trigger the process.
6. The modal dialog closes upon a successful API call, and the application's universe of CEFs is updated in the backend.

---

### **2\. UI Changes**

The primary change to the user interface involves simplifying the modal dialog.

* **Removal of Elements**: The input fields for symbols (equities, income, and tax-free) will be removed from the modal dialog. This simplifies the dialog's appearance and interaction model.
* **Button State**: The "Update Universe" button will be enabled by default when the dialog loads. It will no longer depend on the symbol input fields to be in a valid state.
* **Modal Buttons**: The other existing buttons in the modal will be retained.

---

### **3\. Behavioral Requirements**

The "Update Universe" button's behavior will be modified to reflect the new backend logic:

* **API Call**: When the "Update Universe" button is clicked, it will initiate a request to the server.
* **No Payload**: The frontend will no longer send a list of symbols in the API request payload. The request will be triggered by a simple button click.
* **Server-Side Data Source**: The server-side code is responsible for retrieving the symbols directly from the screener database table and filtering them based on the true boolean fields, as described in the PRD.

---

