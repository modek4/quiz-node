const router = require("express").Router();
const mongoose = require("mongoose");
const jwtMiddleware = require("../addons/jwt");
const { language } = require("../addons/language");
const User = require("../model/user");
const Setting = require("../model/setting");
const { sendErrorResponse } = require("../addons/sendErrorResponse");

/**
 * @route GET /api/main
 * @description Endpoint do renderowania widoku `main` z danymi użytkownika i ustawieniami. Pobiera informacje o użytkowniku, jego akademii oraz preferencjach na podstawie roli użytkownika.
 *
 * @middleware jwtMiddleware(process.env.USER_PERMISSIONS) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (USER, MODERATOR, ADMIN).
 *
 * @returns {HTML} - Renderowany widok `main` z danymi użytkownika oraz ustawieniami.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Renderuje widok.
 * @error {404} - Użytkownik lub ustawienia nie zostały znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/main", {
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! Main quiz page
router.get("/", jwtMiddleware(process.env.USER_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Declare the query
    const userId = mongoose.Types.ObjectId.createFromHexString(req.user._id);
    let usersQuery = [
      { $match: { _id: userId } },
      {
        $lookup: {
          from: "codes",
          localField: "code",
          foreignField: "code",
          as: "codes",
        },
      },
      { $unwind: "$codes" },
    ];
    if (req.user.role == process.env.ADMIN_PERMISSIONS) {
      //* Get all academies for the admin
      usersQuery.push({
        $lookup: {
          from: "academies",
          pipeline: [],
          as: "academy",
        },
      });
    } else {
      //* Get academy for the user or moderator
      usersQuery.push({
        $lookup: {
          from: "academies",
          let: { academyId: { $toObjectId: "$codes.academy_id" } },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$academyId"] } } }],
          as: "academy",
        },
      });
      usersQuery.push({ $unwind: "$academy" });
    }
    //* Get user from database
    let user = await User.aggregate(usersQuery);
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    user = user[0];
    //* Get the settings
    let settings = await Setting.findOne({
      user_id: user._id,
    });
    if (!settings) return sendErrorResponse(res, messages, "settings_not_found");
    //* Set string role
    const roleString =
      {
        [process.env.USER_PERMISSIONS]: "user",
        [process.env.MODERATOR_PERMISSIONS]: "moderator",
        [process.env.ADMIN_PERMISSIONS]: "admin",
      }[req.user.role] || "guest";
    //* Set academy
    const academy = Array.isArray(user.academy)
      ? user.academy.map((item) => ({ name: item.name, academy_id: item._id }))
      : [{ name: user.academy.name, academy_id: user.academy._id }];
    //* Set user data
    settings = {
      display: settings.display,
      sort: settings.sort,
      darkmode: settings.darkmode,
      autosave: settings.autosave,
      explanation: settings.explanation,
      open_question: settings.open_question,
      academy_id: settings.academy_id,
      livecheck: settings.livecheck,
      random: settings.random,
    };
    userData = {
      name: user.name,
      email: user.email,
      code: user.code,
      role: roleString,
      term: user.codes.term || [0],
      academy: academy,
      settings: settings,
    };
    //* Send the appropriate HTML
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.render("main", {
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
