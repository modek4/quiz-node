/**
 * Pobiera kod błędu z obiektu błędu JOI.
 *
 * @function extractError
 * @param {Object} error - Obiekt błędu JOI.
 * @property {string} errorType - Typ błędu.
 * @property {string} errorKey - Klucz błędu.
 * @property {string} errorCode - Kod błędu.
 * @returns {string} errorCode
 */
//! Get error by JOI
const extractError = (error) => {
  //* Get the error type
  const errorType = error.details[0].type.split(".").pop();
  //* If errorType is unknown or undefined return unknown
  if (errorType === "unknown" || errorType === "undefined") return "unknown";
  //* Create the error key
  const errorKey = error.details[0].context.key;
  //* Create the error code
  const errorCode = errorType + "_" + errorKey;
  return errorCode;
};

module.exports = { extractError };
