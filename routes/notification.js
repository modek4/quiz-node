const router = require("express").Router();
const Notification = require("../model/notification");
const User = require("../model/user");
const jwtMiddleware = require("../addons/jwt");
const { extractError } = require("../addons/extractError");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { notificationValidation } = require("../addons/validation");
const { language } = require("../addons/language");
const modPermission = process.env.MODERATOR_PERMISSIONS;
const userPermission = process.env.USER_PERMISSIONS;

/**
 * @route GET /api/notification
 * @description Endpoint do renderowania widoku `notification` z danymi użytkownika. Pobiera dane użytkownika oraz odpowiednie komunikaty językowe, a następnie wyświetla stronę powiadomień.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (USER, MODERATOR, ADMIN).
 *
 * @returns {HTML} - Renderowany widok `notification` z danymi użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Renderuje widok `notification` z danymi użytkownika oraz odpowiednimi tłumaczeniami.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/notification", {
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! Render notification page
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
    res.render("notification", {
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
 * @route POST /api/notification/send/:id
 * @description Endpoint do wysyłania powiadomienia do konkretnego użytkownika. Waliduje dane powiadomienia, zapisuje je w bazie i potwierdza wysłanie.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID użytkownika, do którego powiadomienie ma zostać wysłane.
 * @property {string} req.body.value - Treść powiadomienia.
 *
 * @returns {Object} Obiekt zawierający informacje o wysłaniu powiadomienia:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Powiadomienie zostało pomyślnie wysłane do użytkownika.
 * @error {400} - Walidacja danych powiadomienia zakończona niepowodzeniem.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/notification/send/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ value: "Treść powiadomienia" }),
 * });
 */
//! Send notification to the user
router.post("/send/:id", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Check if the user exists
    const user = await User.findOne({ _id: req.params.id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    const data = {
      email: user.email,
      content: req.body.value,
    };
    //* Validate the data
    const { error } = notificationValidation(data);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Save the notification
    const notification = new Notification({
      email: data.email,
      content: data.content,
    });
    const savedNotification = await notification.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Send the response
    const notificationSuccess = messages.success.send_notification + data.email;
    return res.status(200).send({ message: notificationSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/notification/list
 * @description Endpoint do pobierania listy powiadomień dla zalogowanego użytkownika. Pobiera powiadomienia na podstawie adresu email użytkownika i sortuje je malejąco według daty.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 *
 * @returns {Array<Object>} - Tablica obiektów powiadomień użytkownika, posortowana według daty.
 * @returns {string} Res[].email - Adres email, do którego powiadomienie zostało wysłane.
 * @returns {string} Res[].content - Treść powiadomienia.
 * @returns {Date} Res[].date - Data wysłania powiadomienia.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę powiadomień użytkownika.
 * @error {404} - Użytkownik nie został znaleziony lub brak powiadomień.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/notification/list");
 */
//! List notifications for the user
router.get("/list", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get user from database
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    //* Get the notifications
    const notifications = await Notification.find({ email: user.email }).sort({ date: -1 });
    if (!notifications) return sendErrorResponse(res, messages, "no_notification");
    //* Send the response
    return res.status(200).send(notifications);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/notification/read/:id
 * @description Endpoint do oznaczania powiadomienia jako przeczytanego przez użytkownika. Usuwa powiadomienie z bazy danych po jego przeczytaniu.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID powiadomienia, które ma zostać oznaczone jako przeczytane.
 *
 * @returns {Object} - Obiekt z informacją o oznaczeniu powiadomienia jako przeczytanego:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Powiadomienie zostało pomyślnie oznaczone jako przeczytane i usunięte.
 * @error {404} - Powiadomienie nie zostało znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(/api/notification/read/1234567890, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 * });
 */
//! Read notification by the user
router.post("/read/:id", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Check if the notification exists
    const notification = await Notification.findOne({ _id: req.params.id });
    if (!notification) return sendErrorResponse(res, messages, "notification_not_found");
    //* Change the status
    const readNotification = await Notification.deleteOne({ _id: req.params.id });
    if (!readNotification) return sendErrorResponse(res, messages, "read_notification_failed");
    //* Send the response
    const readNotificationSuccess = messages.success.read_notification;
    return res.status(200).send({ message: readNotificationSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/notification/read
 * @description Endpoint do oznaczania wszystkich powiadomień użytkownika jako przeczytane. Usuwa wszystkie powiadomienia powiązane z adresem email użytkownika.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.email - Adres email użytkownika, którego powiadomienia mają zostać oznaczone jako przeczytane.
 *
 * @returns {Object} - Obiekt z informacją o oznaczeniu powiadomień jako przeczytane:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Powiadomienia użytkownika zostały pomyślnie oznaczone jako przeczytane i usunięte.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(/api/notification/read, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ email: "email@uzytkownika.com" }),
 * });
 */
//! Read all notifications
router.post("/read", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Check if the user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    //* Change the status
    const notifications = await Notification.deleteMany({ email: user.email });
    if (!notifications) return sendErrorResponse(res, messages, "read_notifications_failed");
    //* Send the response
    const readNotificationsSuccess = messages.success.read_notifications;
    return res.status(200).send({ message: readNotificationsSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
