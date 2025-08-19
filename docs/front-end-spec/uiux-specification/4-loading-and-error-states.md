# **4. Loading and Error States**

* Loading
  * While the update request is in flight, show a spinner inside the dialog.
  * Disable action buttons during the request.
* Error
  * On failure, keep the dialog open and show an inline error message (non-blocking) with retry guidance.
  * Provide a retry button; re-enable all actions when the request settles.
* Success
  * On success, close the dialog and refresh the relevant stores/data.

---
