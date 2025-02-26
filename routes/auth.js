const router = require("express").Router();
const User = require("../model/user");
const Code = require("../model/code");
const Academy = require("../model/academy");
const Setting = require("../model/setting");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { language } = require("../addons/language");
const { extractError } = require("../addons/extractError");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const {
  registerValidation,
  loginValidation,
  resetPasswordValidation,
} = require("../addons/validation");

/**
 * Aktualizuje pole `last_login` użytkownika w bazie danych, ustawiając jego wartość na bieżącą datę i czas.
 *
 * @async
 * @function lastLoginUpdate
 * @param {string} id - Unikalny identyfikator użytkownika (`_id`), którego data ostatniego logowania ma zostać zaktualizowana.
 * @returns {Promise<Object|boolean>} - Zwraca obiekt zaktualizowanego użytkownika lub `false`, jeśli wystąpił błąd.
 */
//? Update last login
const lastLoginUpdate = async (id) => {
  try {
    const filter = { _id: id };
    const update = { last_login: Date.now() };
    const user = await User.findOneAndUpdate(filter, update);
    return user;
  } catch (err) {
    console.log(err);
    return false;
  }
};

/**
 * Tworzy token JWT dla użytkownika i wysyła go w ciasteczku HTTP odpowiedzi.
 *
 * @function createAndSendToken
 * @param {Response} res - Obiekt odpowiedzi Express, służący do ustawienia ciasteczka i przekierowania.
 * @param {Object} user - Obiekt użytkownika, zawierający dane `_id` oraz `role`, które są włączane do tokenu.
 * @property {string} user._id - Unikalny identyfikator użytkownika.
 * @property {string} user.role - Rola użytkownika, która jest uwzględniona w tokenie.
 * @returns {Redirect} - Przekierowuje użytkownika na stronę główną aplikacji.
 */
//? Create and send token to the user
const createAndSendToken = (res, user) => {
  const token = jwt.sign({ _id: user._id, role: user.role }, process.env.TOKEN_SECRET);
  res.cookie("auth-token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });
  res.redirect("/api/main");
};

/**
 * @route POST /api/auth/register
 * @description Endpoint do rejestracji nowego użytkownika. Waliduje dane wejściowe, sprawdza dostępność adresu email oraz kodu aktywacyjnego, tworzy nowego użytkownika i przypisuje mu odpowiednie ustawienia.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.name - Imię użytkownika (Tworzone na podstawie adresu email).
 * @property {string} req.body.email - Adres email użytkownika.
 * @property {string} req.body.password - Hasło użytkownika.
 * @property {string} req.body.repassword - Powtórzone hasło użytkownika.
 * @property {string} req.body.code - Kod aktywacyjny wymagany do rejestracji.
 *
 * @returns {Redirect} Tworzy token JWT dla użytkownika i wysyła go w ciasteczku HTTP odpowiedzi.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {201} - Użytkownik został pomyślnie zarejestrowany, ustawienia zostały utworzone, a akademia zaktualizowana.
 * @error {400} - Błąd walidacji danych wejściowych, email już istnieje, kod aktywacyjny niedostępny.
 * @error {500} - Błąd serwera.
 * @redirect {302} - Przekierowanie na stronę główną aplikacji.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/auth/register", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    email: "email@uzytkownika.com",
 *    name: "email",
 *    password: "123456",
 *    repassword: "123456",
 *    code: "ABC123",
 *  }),
 * });
 */
//! Register
router.post("/register", async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we make a user
    const { error } = registerValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Checking if the user is already in the database
    const emailExist = await User.findOne({
      email: req.body.email,
    });
    if (emailExist) return sendErrorResponse(res, messages, "exist_email");
    //* Checking if the code is correct
    const codeAvailable = await Code.findOne({
      code: req.body.code,
      used: false,
    });
    if (!codeAvailable) return sendErrorResponse(res, messages, "unavailable_code");
    //* Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    //* Create a new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      code: req.body.code,
      role: codeAvailable.role,
    });
    //* Create the settings for the user
    const setting = Setting.create({
      user_id: user._id,
      academy_id: codeAvailable.academy_id,
    });
    if (!setting) return sendErrorResponse(res, messages, "setting_created_failed");
    //* Create the user
    const savedUser = await user.save();
    if (!savedUser) return sendErrorResponse(res, messages, "user_created_failed");
    //* Update the code
    const updateCode = await Code.findOneAndUpdate({ code: req.body.code }, { used: true });
    if (!updateCode) return sendErrorResponse(res, messages, "code_updated_failed");
    //* Update the academy user count
    const updateAcademy = await Academy.findOneAndUpdate(
      { _id: codeAvailable.academy_id },
      { $inc: { user_count: 1 } }
    );
    if (!updateAcademy) return sendErrorResponse(res, messages, "academy_count_updated_failed");
    //* Create and assign a token
    createAndSendToken(res, savedUser);
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/auth/login
 * @description Endpoint do logowania użytkownika. Waliduje dane wejściowe, sprawdza dostępność konta i poprawność hasła, a następnie generuje i przypisuje token autoryzacyjny.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.email - Adres email użytkownika.
 * @property {string} req.body.password - Hasło użytkownika.
 *
 * @returns {string} - Token autoryzacyjny przypisany do zalogowanego użytkownika.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Użytkownik został pomyślnie zalogowany i przypisano mu token.
 * @error {400} - Błąd walidacji danych wejściowych, niepoprawne dane logowania lub użytkownik zablokowany.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/auth/login", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    email: "email@uzytkownika.com",
 *    password: "123456",
 *  }),
 * });
 */
//! Login
router.post("/login", async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we verify a user
    const { error } = loginValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Checking if the email exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return sendErrorResponse(res, messages, "wrong_email");
    if (user.blocked) return sendErrorResponse(res, messages, "user_blocked");
    //* Password is correct
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return sendErrorResponse(res, messages, "wrong_password");
    //* Update the last login
    const lastLogin = await lastLoginUpdate(user._id);
    if (!lastLogin) return sendErrorResponse(res, messages, "user_last_login_failed");
    //* Create and assign a token
    createAndSendToken(res, user);
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/auth/resetpassword
 * @description Endpoint do resetowania hasła użytkownika. Waliduje dane wejściowe, sprawdza poprawność kodu aktywacyjnego, generuje nowe hasło, a następnie loguje użytkownika po udanej zmianie hasła.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.email - Adres email użytkownika.
 * @property {string} req.body.password - Nowe hasło użytkownika.
 * @property {string} req.body.code - Kod aktywacyjny wymagany do resetowania hasła.
 *
 * @returns {string} - Token autoryzacyjny przypisany do użytkownika po pomyślnym zresetowaniu hasła.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Hasło użytkownika zostało pomyślnie zresetowane, a użytkownik został zalogowany.
 * @error {400} - Błąd walidacji danych wejściowych, nieprawidłowy email lub kod aktywacyjny.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/auth/resetpassword", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    email: "email@uzytkownika.com",
 *    password: "123456",
 *    repassword: "123456",
 *    code: "ABC123",
 *  }),
 * });
 */
//! Reset password
router.post("/resetpassword", async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we make a user
    const { error } = resetPasswordValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Checking if the email exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return sendErrorResponse(res, messages, "wrong_email");
    //* Checking if the code is correct
    const codeAvailable = await Code.findOne({
      code: req.body.code,
      used: true,
    });
    if (!codeAvailable) return sendErrorResponse(res, messages, "unavailable_code");
    //* Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    //* Update the password
    const newPasswordUser = await User.findOneAndUpdate(
      { email: req.body.email, _id: user._id },
      { password: hashedPassword }
    );
    if (!newPasswordUser) return sendErrorResponse(res, messages, "user_reset_password_failed");
    //* Update the last login
    const lastLogin = await lastLoginUpdate(user._id);
    if (!lastLogin) return sendErrorResponse(res, messages, "user_last_login_failed");
    //* Create and assign a token
    createAndSendToken(res, user);
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/auth/logout
 * @description Endpoint do wylogowania użytkownika. Usuwa token autoryzacyjny z ciasteczek, co skutkuje wylogowaniem użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 *
 * @returns {void}
 *
 * @success {200} - Użytkownik został pomyślnie wylogowany, a token został usunięty z ciasteczek.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch('/api/auth/logout');
 */
//! Logout
router.post("/logout", async (req, res) => {
  res.cookie("auth-token", "").status(200).send();
});

module.exports = router;
