#!/usr/bin/env bash

set -euo pipefail

main() {
  local choice=""
  local other_value=""

  # Get terminal dimensions
  local term_height=$(tput lines)
  local term_width=$(tput cols)

  # Calculate menu dimensions (use 80% of terminal width, max 100)
  local menu_width=$((term_width * 80 / 100))
  if [ $menu_width -gt 100 ]; then
    menu_width=100
  fi
  if [ $menu_width -lt 40 ]; then
    menu_width=40
  fi

  local menu_height=$((term_height - 10))
  if [ $menu_height -lt 10 ]; then
    menu_height=10
  fi

  # Build menu text from the provided problem message so newlines are preserved
  local menu_text
  # Interpret backslash-escaped sequences (\n) in the passed message so callers
  # can pass either real newlines or escaped \n sequences.
  menu_text=$(printf "Problem:\n%b" "$1")

  # Show the multi-line problem message in a msgbox first (whiptail handles multi-line msgbox well)
  local msg_lines
  msg_lines=$(printf "%s\n" "$menu_text" | wc -l)

  # Use a temporary file and whiptail --textbox for reliable multi-line display
  # whiptail --title "AI Assistance Required" --msgbox "$menu_text" $msgbox_height $menu_width

  # Present the concise menu using whiptail
  choice=$(whiptail \
    --title "AI Assistance Required" \
    --menu "$menu_text\nChoose One:" $((menu_height + msg_lines)) $menu_width 3 \
    "continue" "Proceed with operation" \
    "stop"     "Abort operation" \
    "provide help"    "Enter prompt to help AI" \
    3>&1 1>&2 2>&3)

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
      # Create temporary file for multi-line input
      local tmpfile
      tmpfile=$(mktemp)
      # Ensure tmpfile is removed on exit (best-effort) and also explicitly later
      trap 'rm -f "$tmpfile"' EXIT
      echo "# Enter your prompt below. Lines starting with # are ignored." > "$tmpfile"
      echo "# Save and exit your editor when done." >> "$tmpfile"
      echo "" >> "$tmpfile"

      # Use editor (prefer EDITOR env var, fall back to nano, then vi)
      ${EDITOR:-nano} "$tmpfile"

      # Read the content, filtering out comment lines. grep returns exit code 1 when
      # no matches are found which would fail under 'set -euo pipefail'. Wrap the
      # grep pipeline and allow an empty result (|| true) so the script doesn't exit.
      other_value=$({ grep -v '^#' "$tmpfile" | grep -v '^[[:space:]]*$' || true; } | tr '\n' ' ')

      # Clean up (trap will also remove in case of early exit)
      rm -f "$tmpfile"
      trap - EXIT

      if [ -n "$other_value" ]; then
        echo "$other_value"
        return 2
      else
        echo "continue"
        return 0
      fi
      ;;
    *)
      echo "stop."
      return 1
      ;;
  esac
}

main "${1:-No problem specified}"
