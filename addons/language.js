const _ = require("lodash");
const path = require("path");
const fs = require("fs");

/**
 * Pobiera kod języka z nagłówka Accept-Language z żądania HTTP.
 *
 * @function languageCode
 * @param {string} acceptLanguageHeader - Nagłówek Accept-Language z żądania HTTP.
 * @property {string} langCode - Kod języka.
 * @property {Array} languages - Lista języków z nagłówka Accept-Language.
 * @returns {string} Kod języka.
 */
//! Get the language code
const languageCode = (acceptLanguageHeader) => {
  let langCode = "en";
  if (!acceptLanguageHeader) return checkFile(langCode);
  const languages = acceptLanguageHeader.split(",").map((lang) => lang.split(";")[0].trim());

  for (const lang of languages) {
    const [primaryCode] = lang.split("-");
    if (primaryCode && primaryCode.length === 2) return checkFile(primaryCode.toLowerCase());
  }
  return checkFile(langCode);
};

/**
 * Sprawdza, czy plik językowy istnieje w katalogu languages. Jeśli nie, zwraca "en".
 *
 * @function checkFile
 * @param {string} filePath - Ścieżka do pliku językowego.
 * @property {string} basePath - Ścieżka do pliku językowego w katalogu languages.
 * @returns {string} Kod języka, jeśli plik istnieje, w przeciwnym razie "en".
 */
//! Check if the file exists
const checkFile = (filePath) => {
  const basePath = path.join(__dirname, "../languages", `${filePath}.json`);
  if (fs.existsSync(basePath)) {
    return filePath;
  }
  return "en";
};

/**
 * Pobiera teksty na podstawie kodu języka i roli użytkownika. Zwraca obiekt z tekstami w odpowiednim języku. W przypadku braku pliku językowego zwraca teksty w języku angielskim.
 *
 * @async
 * @function language
 * @param {Object} req - Obiekt żądania Express.
 * @property {string} langCode - Kod języka.
 * @property {string} basePath - Ścieżka do pliku językowego.
 * @property {Object} texts - Teksty w wybranym języku.
 * @property {number} role - Rola użytkownika.
 * @property {Object} result - Obiekt z tekstami w odpowiednim języku.
 * @returns {Object} Obiekt z tekstami w odpowiednim języku.
 */
//! Get the texts
const language = async (req) => {
  //* Get the language code
  const langCode = languageCode(req.headers["accept-language"]);
  req.language = langCode;
  //* Import the texts
  const basePath = path.join(__dirname, "../languages", `${req.language}.json`);
  const texts = require(basePath);
  //* Get the role
  const role = req.user ? req.user.role : process.env.GUEST_PERMISSIONS;
  //* Merge the texts
  let result = {};
  if (
    role === parseInt(process.env.ADMIN_PERMISSIONS) ||
    role === parseInt(process.env.MODERATOR_PERMISSIONS)
  ) {
    result = _.merge({}, texts.guest, texts.user, texts.admin);
  } else if (role === parseInt(process.env.USER_PERMISSIONS)) {
    result = _.merge({}, texts.guest, texts.user);
  } else {
    result = _.merge({}, texts.guest);
  }
  return result;
};

module.exports = { language };
