const router = require("express").Router();
const jwtMiddleware = require("../addons/jwt");
const mongoose = require("mongoose");
const User = require("../model/user");
const Code = require("../model/code");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { language } = require("../addons/language");
const adminPermission = process.env.ADMIN_PERMISSIONS;
const modPermission = process.env.MODERATOR_PERMISSIONS;

/**
 * @route POST /api/user/block/:id
 * @description Endpoint do blokowania lub odblokowania użytkownika. Sprawdza, czy użytkownik istnieje, a następnie przełącza jego status blokady. Administratorzy i moderatorzy nie mogą być blokowani przez ten endpoint.
 *
 * @middleware jwtMiddleware(adminPermission) - Middleware sprawdzający uprawnienia administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID użytkownika, który ma zostać zablokowany lub odblokowany.
 *
 * @returns {Object} Obiekt zawierający informacje o zablokowaniu użytkownika:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Komunikat wskazujący, że użytkownik został zablokowany lub odblokowany.
 * @error {404} - Użytkownik nie został znaleziony w bazie danych.
 * @error {403} - Próba zablokowania administratora lub moderatora.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/user/block/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! Block user
router.post("/block/:id", jwtMiddleware(adminPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Check if the user exists
    const user = await User.findOne({ _id: req.params.id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    if (user.role >= process.env.MODERATOR_PERMISSIONS)
      return sendErrorResponse(res, messages, "user_block_admin");
    //* Get the message
    const blockedMessage = user.blocked
      ? messages.success.user_unblocked
      : messages.success.user_blocked;
    if (!blockedMessage) return sendErrorResponse(res, messages, "user_block_failed");
    //* Block / unblock the user
    user.blocked = !user.blocked;
    const blockedUser = await user.save();
    if (!blockedUser) return sendErrorResponse(res, messages, "user_block_failed");
    //* Send the response
    return res.status(200).send({ message: blockedMessage });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/user/list
 * @description Endpoint do wyświetlania listy użytkowników. Dla moderatorów zwraca użytkowników powiązanych z ich akademią, a dla administratorów - pełną listę.
 *
 * @function jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID aktualnie zalogowanego użytkownika.
 * @property {number} req.user.role - Poziom uprawnień aktualnie zalogowanego użytkownika.
 *
 * @returns {Array<Object>} - Lista użytkowników z następującymi właściwościami:
 * @returns {string} Res[].email - Email użytkownika.
 * @returns {string} Res[].last_login_date - Data ostatniego logowania (w formacie DD-MM-YYYY).
 * @returns {string} Res[].last_login_time - Czas ostatniego logowania (w formacie HH:MM:SS).
 * @returns {string} Res[].code - Kod aktywacujny przypisany do użytkownika.
 * @returns {string} Res[].role - Skrócona nazwa roli użytkownika.
 * @returns {string} Res[]._id - Unikalny identyfikator użytkownika.
 * @returns {string} Res[].terms - Lista semestrów przypisanych do użytkownika.
 * @returns {string[]} Res[].terms_id - Lista identyfikatorów przypisanych semestrów.
 * @returns {boolean} Res[].blocked - Status blokady użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Lista użytkowników została zwrócona pomyślnie.
 * @error {404} - Błąd zwrócony, gdy nie można znaleźć użytkowników.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/user/list");
 */
//! List users
router.get("/list", jwtMiddleware(modPermission), async (req, res) => {
  //* Get the role string
  const getRoleString = (roleInt, messages) => {
    const roles = {
      [process.env.USER_PERMISSIONS]: messages.info.role_user_short,
      [process.env.MODERATOR_PERMISSIONS]: messages.info.role_moderator_short,
      [process.env.ADMIN_PERMISSIONS]: messages.info.role_admin_short,
    };
    return roles[roleInt] || messages.info.role_user_short;
  };
  try {
    //* Get the messages
    const messages = await language(req);
    //* Declare the query
    let usersQuery = [
      {
        $lookup: {
          from: "codes",
          localField: "code",
          foreignField: "code",
          as: "codes",
        },
      },
      {
        $unwind: "$codes",
      },
    ];
    //* Find the academy ids for the moderator
    if (req.user.role == process.env.MODERATOR_PERMISSIONS) {
      const userId = mongoose.Types.ObjectId.createFromHexString(req.user._id);
      const academyIds = await User.aggregate([
        { $match: { _id: userId } },
        ...usersQuery,
        {
          $project: {
            academy_id: "$codes.academy_id",
          },
        },
      ]);
      const uniqueAcademyIds = [...new Set(academyIds.map((item) => item.academy_id))];
      usersQuery.push({
        $match: { "codes.academy_id": { $in: uniqueAcademyIds } },
      });
    }
    //* Get all users
    const users = await User.aggregate(usersQuery);
    if (!users) return sendErrorResponse(res, messages, "users_not_found");
    //* Format the users
    const formattedUsers = users.map((user) => {
      const date = user.last_login
        ? user.last_login.toISOString().split("T")[0]
        : messages.info.never_login;
      const time = user.last_login
        ? user.last_login.toTimeString().split(" ")[0]
        : messages.info.never_login;
      return {
        email: user.email || messages.info.no_email,
        last_login_date: date,
        last_login_time: time,
        code: user.code || messages.info.no_code,
        _id: user._id,
        role: getRoleString(user.role, messages) || messages.info.no_short_role,
        terms: user.codes.term.join(", ") || messages.info.no_terms,
        terms_id: user.codes._id || [],
        blocked: user.blocked || false,
      };
    });
    //* Send the users
    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/user/role/:id
 * @description Endpoint do zmiany roli użytkownika. Dostępny wyłącznie dla administratorów. Sprawdza, czy nowa rola jest prawidłowa, a następnie aktualizuje rolę użytkownika i odpowiedniego kodu aktywacyjnego.
 *
 * @middleware jwtMiddleware(adminPermission) - Middleware sprawdzający uprawnienia administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID użytkownika, którego rola ma zostać zmieniona.
 * @property {number} req.body.new_role - Nowa rola użytkownika (1 dla zwykłego użytkownika, 2 dla moderatora).
 * @property {number} req.body.old_role - Aktualna rola użytkownika.
 *
 * @returns {Object} Obiekt zawierający informacje o zmianie roli użytkownika:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Użytkownik został zaktualizowany pomyślnie.
 * @error {400} - Błąd walidacji, gdy podano nieprawidłowe role.
 * @error {404} - Użytkownik lub kod nie został znaleziony.
 * @error {403} - Próba zmiany roli administratora na inną.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/user/role/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ new_role: 1, old_role: 2 }),
 * });
 */
//! Change user role
router.post("/role/:id", jwtMiddleware(adminPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Check if value is valid
    if (
      req.body.new_role <= 0 ||
      req.body.new_role > 2 ||
      !req.body.old_role ||
      req.body.old_role <= 0
    )
      return sendErrorResponse(res, messages, "user_role_failed");
    //* Check if the user exists
    const user = await User.findOne({ _id: req.params.id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    let new_role =
      req.body.new_role == 1
        ? process.env.USER_PERMISSIONS
        : req.body.new_role == 2
        ? process.env.MODERATOR_PERMISSIONS
        : process.env.GUEST_PERMISSIONS;
    if (!new_role) return sendErrorResponse(res, messages, "user_role_failed");
    if (new_role == process.env.GUEST_PERMISSIONS)
      return sendErrorResponse(res, messages, "user_role_admin_failed");
    //* Get the code
    const code = await Code.findOne({ code: user.code });
    if (!code) return sendErrorResponse(res, messages, "code_not_found");
    code.role = new_role;
    user.role = new_role;
    //* Save the user and code
    const updatedUser = await user.save();
    const updatedCode = await code.save();
    if (!updatedUser || !updatedCode) return sendErrorResponse(res, messages, "user_role_failed");
    //* Send the response
    return res.status(200).send({ message: messages.success.user_role_updated });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
