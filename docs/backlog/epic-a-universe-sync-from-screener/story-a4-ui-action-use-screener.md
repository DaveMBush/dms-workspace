# Story A4: UI action "Use Screener"

Description: Add a button in Universe Settings to invoke the sync, show a
spinner, and close on success (feature-flag aware).

Acceptance Criteria:

- Button is visible only when the feature flag is enabled.
- Clicking triggers POST and shows progress.
- On success, dialog closes and data refresh is triggered.
- On error, a visible error message is shown.

Dependencies: Story A1.
