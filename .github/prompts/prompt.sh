#!/usr/bin/env bash

set -euo pipefail

main() {
  local choice=""
  local other_value=""

  choice=$(whiptail \
    --title "Select Option" \
    --menu "Choose one:" 15 60 4 \
    "continue" "Proceed with operation" \
    "stop"     "Abort operation" \
    "provide help"    "Enter prompt to help AI" \
    3>&1 1>&2 2>&3)

  case "$choice" in
    continue)
      echo "Continuing..."
      ;;
    stop)
      echo "Stopping..."
      ;;
    "provide help")
      other_value=$(whiptail \
        --title "Enter prompt to assist AI" \
        --inputbox "Prompt:" \
        10 60 \
        3>&1 1>&2 2>&3)

      echo "You entered: $other_value"
      ;;
    *)
      echo "Cancelled."
      ;;
  esac
}

echo "${1:-No problem specified} - do you want to continue, stop, or provide help?"
main
