/** Recognized Fidelity transaction action types */
const VALID_ACTIONS = [
  'DIVIDEND RECEIVED',
  'ELECTRONIC FUNDS TRANSFER',
  'LONG-TERM CAP GAIN',
  'REINVESTMENT',
  'SHORT-TERM CAP GAIN',
  'YOU BOUGHT',
  'YOU SOLD',
];

interface ActionValidationFailure {
  valid: false;
  error: string;
}

interface ActionValidationSuccess {
  valid: true;
}

/**
 * Validates that the action is a recognized Fidelity transaction type.
 */
export function validateAction(
  action: string
): ActionValidationFailure | ActionValidationSuccess {
  if (VALID_ACTIONS.includes(action)) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `Unknown transaction type: "${action}"`,
  };
}
