const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { language } = require("../addons/language");

/**
 * @route GET /api/texts
 * @description Endpoint do pobierania przetłumaczonych tekstów użytkownika na podstawie jego roli. Jeśli użytkownik jest uwierzytelniony przez token, jego rola zostaje odczytana i uwzględniona przy generowaniu treści.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} [req.header.auth-token] - Token uwierzytelniający z nagłówka.
 * @property {string} [req.cookies.auth-token] - Opcjonalny token uwierzytelniający z ciasteczka.
 *
 * @returns {Object} texts - Zwraca przetłumaczone teksty dopasowane do roli użytkownika.
 *
 * @success {200} - Pomyślnie zwraca przetłumaczone teksty.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/texts", {
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! Get the texts
router.get("/", async (req, res) => {
  //* Get token for role
  const token = req.header("auth-token") || req.cookies["auth-token"];
  if (token) {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = {
      role: decoded.role,
    };
  }
  //* Get the texts
  const texts = await language(req);
  res.json(texts);
});

module.exports = router;
