const router = require("express").Router();
const User = require("../model/user");
const jwtMiddleware = require("../addons/jwt");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { language } = require("../addons/language");
const userPermission = process.env.USER_PERMISSIONS;

/**
 * @route GET /api/report
 * @description Endpoint do renderowania widoku `report` z danymi użytkownika. Na podstawie tokena JWT i roli użytkownika pobiera dane użytkownika z bazy danych oraz odpowiednie komunikaty językowe.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (USER, MODERATOR, ADMIN).
 *
 * @returns {HTML} - Renderowany widok `report` z danymi użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Renderuje widok.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/report", {
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! List scores for the user
router.get("/", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get user from database
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    //* Set string role
    const roleString =
      {
        [process.env.USER_PERMISSIONS]: "user",
        [process.env.MODERATOR_PERMISSIONS]: "moderator",
        [process.env.ADMIN_PERMISSIONS]: "admin",
      }[req.user.role] || "guest";
    //* Set user data
    userData = {
      name: user.name,
      email: user.email,
      code: user.code,
      role: roleString,
    };
    //* Send the appropriate HTML
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.render("report", {
      role: roleString,
      language: req.language,
      messages: messages.texts,
      user: userData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
