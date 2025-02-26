/**
 * Obsługuje wysyłanie odpowiedzi z błędem.
 *
 * @function sendErrorResponse
 * @param {Object} res - Obiekt odpowiedzi Express.
 * @param {Object} messages - Obiekt zawierający komunikaty błędów.
 * @param {string} errorCode - Kod błędu, który ma zostać wysłany.
 * @returns {void}
 */
//! Response error handler
const sendErrorResponse = (res, messages, errorCode) => {
  //* Get the default error message
  const defaultError = messages.errors.internal || {
    status: 500,
    message: "Internal server error",
    description: "Internal server error",
  };
  //* Get the error message
  const errorMessage = messages.errors[errorCode] || defaultError;
  //* Send the error message
  res.status(errorMessage.status || defaultError.status).send(errorMessage || defaultError);
};

module.exports = { sendErrorResponse };
