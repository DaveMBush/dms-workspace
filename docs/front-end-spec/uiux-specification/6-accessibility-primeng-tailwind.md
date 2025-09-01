# **6. Accessibility (PrimeNG + Tailwind)**

- Focus management
  - Focus the first actionable element when the dialog opens.
  - Return focus to the triggering button on close.
- Keyboard
  - Ensure Esc closes the dialog; Tab order is logical and trapped inside.
  - Buttons are reachable and clearly labeled.
- ARIA
  - Dialog uses role=dialog and has aria-labelledby bound to the header.
  - Spinner has aria-live=polite, and error text is announced.
- Contrast
  - Buttons and text follow WCAG AA contrast.

---
