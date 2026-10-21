/**
 * Pure helper that formats error responses into a consistent JSON shape
 * used across the Kitewell backend API.
 */

const DEFAULT_CODE = "INTERNAL_ERROR";
const DEFAULT_MESSAGE = "An unexpected error occurred.";

/**
 * Produce a standardized error response object.
 *
 * @param {string} [code="INTERNAL_ERROR"] Error code identifier.
 * @param {string} [message="An unexpected error occurred."] Human-readable error description.
 * @returns {{ error: { code: string, message: string } }} Standardized response object.
 */
export function formatErrorResponse(code, message) {
  const safeCode = typeof code === "string" && code.trim().length > 0
    ? code.trim()
    : DEFAULT_CODE;

  const safeMessage = typeof message === "string" && message.trim().length > 0
    ? message.trim()
    : DEFAULT_MESSAGE;

  return {
    error: {
      code: safeCode,
      message: safeMessage,
    },
  };
}

/**
 * Check whether a value conforms to the standardized error response shape.
 *
 * @param {unknown} value Candidate value to check.
 * @returns {boolean} True if value has { error: { code: string, message: string } }.
 */
export function isErrorResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const err = value.error;
  if (!err || typeof err !== "object" || Array.isArray(err)) return false;
  return typeof err.code === "string" && typeof err.message === "string";
}
