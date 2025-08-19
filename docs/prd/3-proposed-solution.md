# **3. Proposed Solution**

The manual symbol input fields on the modal dialog will be removed. The universe of tradable CEFs will now be updated automatically based on the results of the "Screener" screen. The buttons on the modal dialog, including the one that triggers the universe update, will remain in place.

The specific requirements for this solution are:

* The system will access the screener database table.
* It will identify all entries in the table where the three boolean fields are set to true.
* The symbol from each of these identified entries will be used to populate and update the universe of tradable CEFs.
* The existing functionality that consumes the universe (e.g., the trading screen) must be updated to use this new data source.

---
