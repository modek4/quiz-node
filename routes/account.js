const router = require("express").Router();
const User = require("../model/user");
const Setting = require("../model/setting");
const Notification = require("../model/notification");
const bcrypt = require("bcryptjs");
const jwtMiddleware = require("../addons/jwt");
const { language } = require("../addons/language");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { extractError } = require("../addons/extractError");
const { nameValidation, passwordValidation, emailValidation } = require("../addons/validation");
const userPermission = process.env.USER_PERMISSIONS;

/**
 * @route GET /api/account
 * @description Endpoint do renderowania widoku `account` z danymi użytkownika i jego ustawieniami. Pobiera informacje o użytkowniku oraz jego preferencje wyświetlania i przechowuje w renderowanym widoku.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (USER, MODERATOR, ADMIN).
 *
 * @returns {HTML} - Renderowany widok `account` z danymi użytkownika oraz jego ustawieniami.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Renderuje widok `account` z danymi użytkownika oraz odpowiednimi tłumaczeniami.
 * @error {404} - Użytkownik lub ustawienia nie zostały znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/account", {
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! List profile for the user
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
    //* Get settings
    const settings = await Setting.findOne({ user_id: req.user._id });
    if (!settings) return sendErrorResponse(res, messages, "settings_not_found");
    //* Set user data
    userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      code: user.code,
      role: roleString,
      settings: {
        autosave: settings.autosave,
        darkmode: settings.darkmode,
        display: settings.display,
        explanation: settings.explanation,
        open_question: settings.open_question,
        sort: settings.sort,
        livecheck: settings.livecheck,
        random: settings.random,
      },
    };
    //* Send the appropriate HTML
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.render("account", {
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

/**
 * @route PUT /api/account/update
 * @description Endpoint do aktualizacji wybranych ustawień konta użytkownika. Na podstawie typu ustawienia aktualizuje odpowiednią wartość i wysyła powiadomienie o zmianie.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {string} req.body.type - Typ ustawienia (np. "autosave", "darkmode", "display").
 * @property {boolean|string} req.body.value - Nowa wartość dla danego typu ustawienia.
 *
 * @returns {Object} Zwraca obiekt z komunikatem o sukcesie lub błędzie aktualizacji ustawień.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Ustawienia użytkownika zostały pomyślnie zaktualizowane i zapisane.
 * @error {400} - Niepoprawny typ ustawienia.
 * @error {404} - Użytkownik lub ustawienia nie zostały znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/account/update", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ type: "display", value: "grid" }),
 * })
 */
//! Update the user's data in settings
router.put("/update", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get user from database
    const user = await Setting.findOne({ user_id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    let notification = messages.success.changed_settings;
    //* Update the user's settings
    switch (req.body.type) {
      case "autosave":
        user.autosave = req.body.value;
        notification += `: ${messages.texts.account_autosave}(${req.body.value})`;
        break;
      case "darkmode":
        user.darkmode = req.body.value;
        notification += `: ${messages.texts.account_darkmode}(${req.body.value})`;
        break;
      case "display":
        user.display = req.body.value;
        break;
      case "explanation":
        user.explanation = req.body.value;
        notification += `: ${messages.texts.account_explanation}(${req.body.value})`;
        break;
      case "open_question":
        user.open_question = req.body.value;
        notification += `: ${messages.texts.account_open}(${req.body.value})`;
        break;
      case "sort":
        user.sort = req.body.value;
        break;
      case "academy_id":
        user.academy_id = req.body.value;
        break;
      case "random":
        user.random = req.body.value;
        notification += `: ${messages.texts.account_random}(${req.body.value})`;
        break;
      case "livecheck":
        user.livecheck = req.body.value;
        notification += `: ${messages.texts.account_livecheck}(${req.body.value})`;
        break;
      default:
        return sendErrorResponse(res, messages, "invalid_type");
    }
    const userUpdated = await user.save();
    if (!userUpdated) return sendErrorResponse(res, messages, "user_not_updated");
    //* Send notification
    const userEmail = await User.findOne({ _id: req.user._id });
    if (!userEmail) return sendErrorResponse(res, messages, "user_not_found");
    //* Send notification
    const notificationObject = new Notification({
      email: userEmail.email,
      content: notification,
    });
    const savedNotification = await notificationObject.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Send the response
    const userUpdatedSuccess = messages.success.user_updated;
    res.status(200).send({ message: userUpdatedSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route PATCH /api/account/name
 * @description Endpoint do aktualizacji pseudonimu użytkownika. Waliduje nową nazwę, aktualizuje ją w bazie danych, a następnie wysyła powiadomienie do użytkownika.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {string} req.body.name - Nowa nazwa użytkownika do ustawienia.
 *
 * @returns {Object} Obiektem z komunikatem o sukcesie lub błędzie aktualizacji pseudonimu.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pseudonim użytkownika został pomyślnie zaktualizowany.
 * @error {400} - Błąd walidacji danych.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("api/account/name", {
 * method: "POST",
 *  headers: { "Content-Type": "application/json", },
 *  body: JSON.stringify({ name: "Nowy pseudonim" }),
 * });
 */
//! Update the user's nickname
router.patch("/name", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we make a user
    const { error } = nameValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Get user from database
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    //* Update the user's nickname
    user.name = req.body.name;
    const userUpdated = await user.save();
    if (!userUpdated) return sendErrorResponse(res, messages, "user_not_updated");
    //* Send notification
    const notification = new Notification({
      email: user.email,
      content: messages.success.nickname_updated_notification,
    });
    const savedNotification = await notification.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Send the response
    const userUpdatedSuccess = messages.success.nickname_updated;
    res.status(200).send({ message: userUpdatedSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route PATCH /api/account/password
 * @description Endpoint do aktualizacji hasła użytkownika. Sprawdza poprawność starego hasła, waliduje nowe hasło, a następnie je aktualizuje. Po zmianie hasła wysyła powiadomienie do użytkownika.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {string} req.body.old_password - Obecne hasło użytkownika.
 * @property {string} req.body.password - Nowe hasło do ustawienia.
 * @property {string} req.body.repassword - Powtórzone nowe hasło.
 *
 * @returns {Object} Obiektem z komunikatem o sukcesie lub błędzie aktualizacji hasła.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Hasło użytkownika zostało pomyślnie zaktualizowane.
 * @error {400} - Błąd walidacji danych lub niepoprawne stare hasło.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("api/account/password", {
 * method: "POST",
 *  headers: { "Content-Type": "application/json", },
 *  body: JSON.stringify({
 *    old_password: "654321",
 *    password: "123456",
 *    repassword: "123456",
 *  }),
 * });
 */
//! Update the user's password
router.patch("/password", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we change the password
    const { error } = passwordValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Get user from database
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    //* Check if the old password is correct
    const validPassword = await bcrypt.compare(req.body.old_password, user.password);
    if (!validPassword) return sendErrorResponse(res, messages, "invalid_password");
    //* Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    //* Update the user's password
    user.password = hashedPassword;
    const userUpdated = await user.save();
    if (!userUpdated) return sendErrorResponse(res, messages, "user_not_updated");
    //* Send notification
    const notification = new Notification({
      email: user.email,
      content: messages.success.password_updated_notification,
    });
    const savedNotification = await notification.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Send the response
    const userUpdatedSuccess = messages.success.password_updated;
    res.status(200).send({ message: userUpdatedSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route PATCH /api/account/email
 * @description Endpoint do aktualizacji adresu email użytkownika. Sprawdza poprawność obecnego adresu email i hasła, waliduje nowy adres email, a następnie go aktualizuje. Po zmianie wysyła powiadomienie do użytkownika.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {string} req.body.old_email - Obecny adres email użytkownika.
 * @property {string} req.body.email - Nowy adres email do ustawienia.
 * @property {string} req.body.password - Hasło użytkownika wymagane do zatwierdzenia zmiany.
 *
 * @returns {Object} Obiektem z komunikatem o sukcesie lub błędzie aktualizacji adresu email.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Adres email użytkownika został pomyślnie zaktualizowany.
 * @error {400} - Błąd walidacji danych lub niepoprawne obecne dane uwierzytelniające.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("api/account/email", {
 * method: "POST",
 *  headers: { "Content-Type": "application/json", },
 *  body: JSON.stringify({
 *    old_email: "stary@email.com",
 *    email: "nowy@email.com",
 *    password: "123456",
 *  }),
 * });
 */
//! Change the user's email
router.patch("/email", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we change the email
    const { error } = emailValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Get user from database
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    //* Check if the old email is correct
    if (user.email !== req.body.old_email) return sendErrorResponse(res, messages, "invalid_email");
    //* Check if the old password is correct
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return sendErrorResponse(res, messages, "invalid_password");
    //* Update the user's email
    user.email = req.body.email;
    const userUpdated = await user.save();
    if (!userUpdated) return sendErrorResponse(res, messages, "user_not_updated");
    //* Change email in notifications
    const notifications = await Notification.updateMany(
      { email: req.body.old_email },
      { email: req.body.email }
    );
    if (!notifications) return sendErrorResponse(res, messages, "change_email_failed");
    //* Send notification
    const notification = new Notification({
      email: user.email,
      content: messages.success.email_updated_notification,
    });
    const savedNotification = await notification.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Send the response
    const userUpdatedSuccess = messages.success.email_updated;
    res.status(200).send({ message: userUpdatedSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
