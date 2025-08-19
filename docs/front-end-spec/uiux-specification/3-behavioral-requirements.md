# **3. Behavioral Requirements**

The "Update Universe" button's behavior will be modified to reflect the new backend logic:

* **API Call**: When the "Update Universe" button is clicked, it will initiate a request to the server.
* **No Payload**: The frontend will no longer send a list of symbols in the API request payload. The request will be triggered by a simple button click.
* **Server-Side Data Source**: The server-side code is responsible for retrieving the symbols directly from the screener database table and filtering them based on the true boolean fields, as described in the PRD.

---
