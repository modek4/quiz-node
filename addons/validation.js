const Joi = require("joi");

/**
 * Walidacja nazwy użytkownika.
 *
 * @function nameValidation
 * @param {Object} req - Obiekt żądania zawierający nazwę użytkownika.
 * @property {string} name - Nazwa użytkownika musi zawierać od 3 do 255 znaków.
 * @returns {Object} Wynik walidacji nazwy.
 */
//! Name Validation
const nameValidation = (req) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja hasła użytkownika.
 *
 * @function passwordValidation
 * @param {Object} req - Obiekt żądania zawierający hasło użytkownika.
 * @property {string} old_password - Stare hasło użytkownika musi zawierać co najmniej 6 znaków.
 * @property {string} password - Nowe hasło użytkownika musi zawierać co najmniej 6 znaków, jedną dużą literę, jedną małą literę, jedną cyfrę i jeden znak specjalny.
 * @property {string} repassword - Powtórzone hasło użytkownika musi być takie samo jak nowe hasło.
 * @returns {Object} Wynik walidacji hasła.
 */
//! Password Validation
const passwordValidation = (req) => {
  const schema = Joi.object({
    old_password: Joi.string().min(6).required(),
    password: Joi.string()
      .min(6)
      .pattern(new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0d]).{6,}$"))
      .required(),
    repassword: Joi.string().min(6).required().valid(Joi.ref("password")),
  });

  return schema.validate(req);
};

/**
 * Walidacja adresu e-mail użytkownika.
 *
 * @function emailValidation
 * @param {Object} req - Obiekt żądania zawierający adres e-mail użytkownika.
 * @property {string} old_email - Stary adres e-mail użytkownika musi być poprawny i zawierać od 6 do 255 znaków.
 * @property {string} email - Nowy adres e-mail użytkownika musi być poprawny i zawierać od 6 do 255 znaków.
 * @property {string} password - Hasło użytkownika musi zawierać co najmniej 6 znaków, jedną dużą literę, jedną małą literę, jedną cyfrę i jeden znak specjalny.
 * @returns {Object} Wynik walidacji.
 */
//! Email Validation
const emailValidation = (req) => {
  const schema = Joi.object({
    old_email: Joi.string().min(6).max(255).required().email(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string()
      .min(6)
      .pattern(new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0d]).{6,}$"))
      .required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja rejestracji użytkownika.
 *
 * @function registerValidation
 * @param {Object} req - Obiekt żądania zawierający dane rejestracyjne użytkownika.
 * @property {string} email - Adres e-mail użytkownika musi być poprawny i zawierać od 6 do 255 znaków.
 * @property {string} name - Nazwa użytkownika musi zawierać od 3 do 255 znaków.
 * @property {string} password - Hasło użytkownika musi zawierać co najmniej 6 znaków, jedną dużą literę, jedną małą literę, jedną cyfrę i jeden znak specjalny.
 * @property {string} repassword - Powtórzone hasło użytkownika musi być takie samo jak hasło.
 * @property {string} code - Kod aktywacyjny użytkownika musi zawierać 8 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Register Validation
const registerValidation = (req) => {
  const schema = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    name: Joi.string().min(3).max(255).required(),
    password: Joi.string()
      .min(6)
      .pattern(new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0d]).{6,}$"))
      .required(),
    repassword: Joi.string().min(6).required().valid(Joi.ref("password")),
    code: Joi.string().length(8).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja logowania użytkownika.
 *
 * @function loginValidation
 * @param {Object} req - Obiekt żądania zawierający dane logowania użytkownika.
 * @property {string} email - Adres e-mail użytkownika musi być poprawny i zawierać od 6 do 255 znaków.
 * @property {string} password - Hasło użytkownika musi zawierać co najmniej 6 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Login Validation
const loginValidation = (req) => {
  const schema = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).required(),
  });
  return schema.validate(req);
};

/**
 * Walidacja resetowania hasła użytkownika.
 *
 * @function resetPasswordValidation
 * @param {Object} req - Obiekt żądania zawierający dane do resetowania hasła użytkownika.
 * @property {string} email - Adres e-mail użytkownika musi być poprawny i zawierać od 6 do 255 znaków.
 * @property {string} password - Nowe hasło użytkownika musi zawierać co najmniej 6 znaków.
 * @property {string} repassword - Powtórzone hasło użytkownika musi być takie samo jak nowe hasło.
 * @property {string} code - Kod aktywacyjny użytkownika musi zawierać 8 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Reset Password Validation
const resetPasswordValidation = (req) => {
  const schema = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).required(),
    repassword: Joi.string().min(6).required().valid(Joi.ref("password")),
    code: Joi.string().length(8).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja tworzenia akademii.
 *
 * @function academyValidation
 * @param {Object} req - Obiekt żądania zawierający dane akademii.
 * @property {string} name - Nazwa akademii musi zawierać od 6 do 255 znaków.
 * @property {string} code - Kod akademii musi zawierać od 2 do 10 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Create academy Validation
const academyValidation = (req) => {
  const schema = Joi.object({
    name: Joi.string().min(6).max(255).required(),
    code: Joi.string().min(2).max(10).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja kodu akademii.
 *
 * @function academyCodeValidation
 * @param {Object} req - Obiekt żądania zawierający kod akademii.
 * @property {string} code - Kod akademii musi zawierać od 2 do 10 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Create academy code Validation
const academyCodeValidation = (req) => {
  const schema = Joi.object({
    code: Joi.string().min(2).max(10).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja nazwy akademii.
 *
 * @function academyNameValidation
 * @param {Object} req - Obiekt żądania zawierający nazwę akademii.
 * @property {string} name - Nazwa akademii musi zawierać od 6 do 255 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Create academy name Validation
const academyNameValidation = (req) => {
  const schema = Joi.object({
    name: Joi.string().min(6).max(255).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja tworzenia kodu.
 *
 * @function codeValidation
 * @param {Object} req - Obiekt żądania zawierający dane kodu.
 * @property {number} amount - Ilość kodów musi być liczbą całkowitą z przedziału od 1 do 100.
 * @property {array} term - Terminy muszą być tablicą liczb całkowitych z przedziału od 1 do 14.
 * @property {number} role - Rola musi być liczbą.
 * @property {string} academy_id - Identyfikator akademii musi być ciągiem znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Create code Validation
const codeValidation = (req) => {
  const schema = Joi.object({
    amount: Joi.number().integer().min(1).max(100).required(),
    term: Joi.array().items(Joi.number().integer().min(1).max(14)).min(1).max(14).required(),
    role: Joi.number().required(),
    academy_id: Joi.string().required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja edycji semestru.
 *
 * @function editTermValidation
 * @param {Object} req - Obiekt żądania zawierający dane semestru.
 * @property {array} term - Terminy muszą być tablicą liczb całkowitych z przedziału od 1 do 14.
 * @returns {Object} Wynik walidacji.
 */
//! Edit term Validation
const editTermValidation = (req) => {
  const schema = Joi.object({
    term: Joi.array().items(Joi.number().integer().min(1).max(14)).min(1).max(14).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja powiadomienia.
 *
 * @function notificationValidation
 * @param {Object} req - Obiekt żądania zawierający dane powiadomienia.
 * @property {string} email - Adres e-mail użytkownika musi być poprawny i zawierać od 6 do 255 znaków.
 * @property {string} content - Treść powiadomienia musi zawierać od 1 do 1024 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Edit term Validation
const notificationValidation = (req) => {
  const schema = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    content: Joi.string().min(1).max(1024).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja quizu.
 *
 * @function quizValidation
 * @param {Object} req - Obiekt żądania zawierający dane quizu.
 * @property {string} name - Nazwa quizu musi zawierać od 6 do 255 znaków.
 * @property {array} terms - Terminy muszą być tablicą liczb całkowitych z przedziału od 1 do 14.
 * @property {string} academy - Identyfikator akademii musi być ciągiem znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Quiz Validation
const quizValidation = (req) => {
  const schema = Joi.object({
    name: Joi.string().min(6).max(255).required(),
    terms: Joi.array().items(Joi.number().integer().min(1).max(14)).min(1).max(14).required(),
    academy: Joi.string().required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja nazwy quizu.
 *
 * @function quizNameValidation
 * @param {Object} req - Obiekt żądania zawierający nazwę quizu.
 * @property {string} name - Nazwa quizu musi zawierać od 6 do 255 znaków.
 * @returns {Object} Wynik walidacji.
 */
//! Quiz Name Validation
const quizNameValidation = (req) => {
  const schema = Joi.object({
    name: Joi.string().min(6).max(255).required(),
  });

  return schema.validate(req);
};

/**
 * Walidacja terminów quizu.
 *
 * @function quizTermsValidation
 * @param {Object} req - Obiekt żądania zawierający terminy quizu.
 * @property {array} terms - Terminy muszą być tablicą liczb całkowitych z przedziału od 1 do 14.
 * @returns {Object} Wynik walidacji.
 */
//! Quiz Terms Validation
const quizTermsValidation = (req) => {
  const schema = Joi.object({
    terms: Joi.array().items(Joi.number().integer().min(1).max(14)).min(1).max(14).required(),
  });

  return schema.validate(req);
};

module.exports = {
  nameValidation,
  passwordValidation,
  emailValidation,
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  academyValidation,
  academyCodeValidation,
  academyNameValidation,
  codeValidation,
  editTermValidation,
  notificationValidation,
  quizValidation,
  quizNameValidation,
  quizTermsValidation,
};
