# Backup and restore (SQLite)

- Backup
  - Stop the server.
  - Copy the SQLite file (path from `DATABASE_URL`).
  - Store backup with timestamp.

- Restore
  - Stop the server.
  - Replace the SQLite file with the backup copy.
  - Start the server.
