#!/usr/bin/env bash

set -euo pipefail

# Ignore SIGINT so that agent infrastructure interruptions (e.g. conversation
# summarization) don't kill this script while the dialog is waiting for input.
trap '' INT

main() {
  local choice=""
  local other_value=""

  # Build menu text from the provided problem message so newlines are preserved
  local menu_text
  # Interpret backslash-escaped sequences (\n) in the passed message so callers
  # can pass either real newlines or escaped \n sequences.
  # Wrap long lines at 80 characters so the dialog doesn't expand to fit a
  # single very long line.
  menu_text=$(printf "Problem:\n%b" "$1" | fold -s -w 80)

  # Use zenity for a GUI dialog that works reliably when called through
  # automated tools (e.g. Copilot) that capture terminal I/O, preventing
  # TUI apps like whiptail from rendering correctly.
  # Run zenity via setsid so it gets its own session and won't receive SIGINT
  # sent to the parent process group (e.g. from agent infrastructure restarts).
  choice=$(setsid zenity \
    --list \
    --title "AI Assistance Required" \
    --text "$menu_text\n\nChoose one:" \
    --radiolist \
    --column "" \
    --column "Option" \
    --column "Description" \
    --print-column=2 \
    TRUE  "continue"      "Proceed with operation" \
    FALSE "stop"          "Abort operation" \
    FALSE "provide help"  "Enter prompt to help AI" \
    --width=480 --height=320 \
    2>/dev/null || true)

  case "$choice" in
    continue)
      echo "continue"
      return 0
      ;;
    stop)
      echo "stop"
      return 1
      ;;
    "provide help")
      # Use zenity editable text-info to collect multi-line input from operator
      # setsid isolates it from SIGINT sent to the parent process group.
      other_value=$(setsid zenity \
        --text-info \
        --editable \
        --title "Enter help prompt" \
        --width=700 --height=450 \
        2>/dev/null || true)

      if [ -n "$other_value" ]; then
        echo "$other_value"
        return 2
      else
        # Operator cancelled or cleared the help dialog — treat as stop
        echo "stop"
        return 1
      fi
      ;;
    *)
      # Dialog cancelled (X button) or empty — treat as stop
      echo "stop"
      return 1
      ;;
  esac
}

main "${1:-No problem specified}"
