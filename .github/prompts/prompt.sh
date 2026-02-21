#!/usr/bin/env bash

set -euo pipefail

main() {
  local choice=""
  local other_value=""

  # Build menu text from the provided problem message so newlines are preserved
  local menu_text
  # Interpret backslash-escaped sequences (\n) in the passed message so callers
  # can pass either real newlines or escaped \n sequences.
  menu_text=$(printf "Problem:\n%b" "$1")

  # Use zenity for a GUI dialog that works reliably when called through
  # automated tools (e.g. Copilot) that capture terminal I/O, preventing
  # TUI apps like whiptail from rendering correctly.
  choice=$(zenity \
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
    --width=640 --height=320 \
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
      other_value=$(zenity \
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
