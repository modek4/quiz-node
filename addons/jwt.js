const jwt = require("jsonwebtoken");
const { language } = require("./language");
const { sendErrorResponse } = require("./sendErrorResponse");

/**
 * Middleware do walidacji JWT i sprawdzania uprawnień użytkownika.
 *
 * @function
 * @param {number} requiredRole - Wymagana rola użytkownika.
 * @property {string} token - Token JWT.
 * @property {Object} decoded - Zdekodowany token JWT.
 * @throws {Error} Jeśli token jest nieprawidłowy.
 * @returns {Function} Middleware Express do walidacji JWT i sprawdzania uprawnień użytkownika.
 */
//! JWT validation middleware
module.exports = function (requiredRole) {
  return async function (req, res, next) {
    //* Check if token exists
    const token = req.header("auth-token") || req.cookies["auth-token"];
    if (!token) return res.status(401).send("Access Denied");
    //* Get the messages
    const messages = await language(req);
    try {
      //* Verify token
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = decoded;
      //* Check if the user has the required role
      if (requiredRole && decoded.role < requiredRole)
        return sendErrorResponse(res, messages, "insufficient_permissions");
      next();
    } catch (err) {
      res.status(400).send("Invalid Token");
    }
  };
};
