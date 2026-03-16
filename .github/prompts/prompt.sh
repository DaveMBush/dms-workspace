#!/usr/bin/env bash

set -euo pipefail

# Ignore SIGINT so that agent infrastructure interruptions (e.g. conversation
# summarization) don't kill this script while the dialog is waiting for input.
trap '' INT

main() {
  # Build display text from the provided message, preserving newlines and
  # wrapping long lines at 80 characters.
  local menu_text
  menu_text=$(printf "%b" "$1" | fold -s -w 80)

  # Use zenity for a GUI dialog that works reliably when called through
  # automated tools (e.g. Copilot) that capture terminal I/O, preventing
  # TUI apps like whiptail from rendering correctly.
  # Run zenity via setsid so it gets its own session and won't receive SIGINT
  # sent to the parent process group (e.g. from agent infrastructure restarts).
  # Pipe an empty string so the editable textarea starts blank.
  local response
  response=$(echo "" | setsid zenity \
    --text-info \
    --editable \
    --title "AI Assistance Required" \
    --text "$menu_text" \
    --width=700 --height=500 \
    2>/dev/null || true)

  # Trim leading/trailing whitespace
  response=$(echo "$response" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  if [ -z "$response" ]; then
    # Cancelled (X button) or empty — treat as stop
    echo "stop"
    return 1
  fi

  case "$response" in
    stop)
      echo "stop"
      return 1
      ;;
    continue)
      echo "continue"
      return 0
      ;;
    *)
      # Custom instructions — return the text with exit code 2
      echo "$response"
      return 2
      ;;
  esac
}

main "${1:-No problem specified}"
