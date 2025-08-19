# **8. Edge cases**

* No eligible Screener rows
  * Show success toast with note: "No symbols qualified; nothing changed".
* Partial updates (network/API hiccups)
  * Show error; allow retry. Do not close the dialog automatically.
* Timeout
  * Show timeout error with retry. Keep the dialog open.
* Backend validation error
  * Show inline message; do not clear user context (keep dialog state).
