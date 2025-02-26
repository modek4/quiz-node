const router = require("express").Router();
const User = require("../model/user");
const Code = require("../model/code");
const Academy = require("../model/academy");
const mongoose = require("mongoose");
const jwtMiddleware = require("../addons/jwt");
const { extractError } = require("../addons/extractError");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { codeValidation } = require("../addons/validation");
const { language } = require("../addons/language");
const modPermission = process.env.MODERATOR_PERMISSIONS;

/**
 * Asynchronicznie generuje unikalne kody alfanumeryczne o zadanej liczbie, upewniając się, że żaden z wygenerowanych kodów nie jest duplikatem już istniejącego w bazie danych.
 *
 * @async
 * @function generateCodes
 * @param {number} amount - Liczba kodów do wygenerowania.
 * @returns {Promise<Array<{code: string, used: boolean}>>} - Obietnica zwracająca tablicę obiektów reprezentujących kody. Każdy obiekt zawiera właściwość `code` (string) oraz `used` (boolean) ustawioną na `false`.
 */
//! Generate codes
const generateCodes = async (amount) => {
  const codes = new Set();
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < amount; i++) {
    let generatedCode = "";
    //* Generate a random code
    generatedCode = Array.from({ length: 8 }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join("");
    //* Check if the code already exists
    const codeExists = await Code.findOne({ code: generatedCode });
    if (!codeExists) {
      codes.add({
        code: generatedCode,
        used: false,
      });
    } else {
      i--;
    }
  }
  return Array.from(codes);
};

/**
 * @route POST /api/code/create
 * @description Endpoint do tworzenia nowych kodów aktywacyjnych. Waliduje dane wejściowe, generuje kody, sprawdza istnienie akademii, a następnie zapisuje kody w bazie danych.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.term - Semestry związane z kodami, rozdzielone przecinkami.
 * @property {string} req.body.role - Rola, dla której kody są generowane (`user` lub `moderator`).
 * @property {number} req.body.amount - Ilość kodów do wygenerowania.
 * @property {string} req.body.academy_id - ID akademii, do której przypisane będą kody.
 *
 * @returns {Object} Obiekt zawierający informacje o wygenerowanych kodach:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {201} - Kody aktywacyjne zostały pomyślnie wygenerowane i zapisane.
 * @error {400} - Błąd walidacji danych wejściowych.
 * @error {404} - Akademia nie została znaleziona.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/code/create", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    amount: 1,
 *    term: "2,3",
 *    role: "user",
 *    academy_id: "0987654321",
 *  }),
 * });
 */
//! Create code
router.post("/create", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the terms
    req.body.term = [
      ...new Set(
        req.body.term
          .split(",")
          .map((term) => parseInt(term))
          .sort()
      ),
    ];
    //* Validate the role
    req.body.role = parseInt(
      {
        ["user"]: process.env.USER_PERMISSIONS,
        ["moderator"]: process.env.MODERATOR_PERMISSIONS,
      }[req.body.role]
    );
    //* Validate the amount
    req.body.amount = parseInt(req.body.amount);
    //* Validate the data
    const { error } = codeValidation(req.body);
    if (error) {
      //* Get the error code and message
      let errorCode = extractError(error);
      //* Special check form terms array values
      const isTermInvalid = /^max_\d{1,2}$/.test(errorCode) || /^min_\d{1,2}$/.test(errorCode);
      if (isTermInvalid && parseInt(errorCode.match(/\d+/)[0], 10) <= 14) errorCode = "base_term";
      return sendErrorResponse(res, messages, errorCode);
    }
    //* Check if the academy exists
    const academy = await Academy.findById(req.body.academy_id);
    if (!academy) return sendErrorResponse(res, messages, "academy_not_found");
    //* Generate the codes
    const codes = await generateCodes(req.body.amount);
    if (!codes) return sendErrorResponse(res, messages, "activation_code_generate_failed");
    //* Save the codes
    const savedCodes = await Code.insertMany(
      codes.map((code) => ({
        ...code,
        term: req.body.term,
        academy_id: req.body.academy_id,
        role: req.body.role,
      }))
    );
    if (!savedCodes) return sendErrorResponse(res, messages, "activation_code_add_failed");
    const savedCodesSuccess = messages.success.activation_code_added;
    return res.status(201).send({ message: savedCodesSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route DELETE /api/code/delete
 * @description Endpoint do usuwania nieużytego kodu aktywacyjnego. Sprawdza, czy kod istnieje i nie został jeszcze użyty, a następnie usuwa go z bazy danych.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.id - ID kodu aktywacyjnego, który ma zostać usunięty.
 *
 * @returns {Object} Obiekt zawierający informacje o usuniętym kodzie:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Kod aktywacyjny został pomyślnie usunięty.
 * @error {404} - Kod aktywacyjny nie został znaleziony lub już został użyty.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/code/delete/${id}`, {
 *  method: "DELETE",
 *  headers: { "Content-Type": "application/json" },
 * })
 */
//! Delete code
router.delete("/delete/:id", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Checking if the code is already in the database
    const codeExist = await Code.findOne({ _id: req.params.id, used: false });
    if (!codeExist) return sendErrorResponse(res, messages, "activation_code_not_found");
    //* Delete the code
    const deletedCode = await Code.deleteOne({ _id: req.params.id });
    if (!deletedCode) return sendErrorResponse(res, messages, "activation_code_delete_failed");
    const deletedCodeSuccess = messages.success.activation_code_deleted;
    return res.status(200).send({ message: deletedCodeSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/code/list
 * @description Endpoint do pobierania listy nieużytych kodów aktywacyjnych. Moderatorzy widzą tylko kody przypisane do akademii, z którą są powiązani, a administratorzy widzą wszystkie nieużyte kody.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora lub administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (Moderator lub Admin).
 *
 * @returns {Array<Object>} - Tablica obiektów kodów aktywacyjnych wraz z nazwą akademii i rolą.
 * @returns {string} Res[].code - Kod aktywacyjny.
 * @returns {string} Res[].academy - Nazwa akademii przypisanej do kodu.
 * @returns {string} Res[].role - Rola powiązana z kodem aktywacyjnym.
 * @returns {boolean} Res[].used - Status, czy kod został już użyty.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę nieużytych kodów aktywacyjnych.
 * @error {404} - Błąd przy pobieraniu kodów aktywacyjnych lub akademii.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/code/list");
 */
//! List codes
router.get("/list", jwtMiddleware(modPermission), async (req, res) => {
  //* Get the role string
  const getRoleString = (roleInt, messages) => {
    const roles = {
      [process.env.USER_PERMISSIONS]: messages.texts.user_role,
      [process.env.MODERATOR_PERMISSIONS]: messages.texts.moderator_role,
      [process.env.ADMIN_PERMISSIONS]: messages.texts.admin_role,
    };
    return roles[roleInt] || messages.texts.user_role;
  };
  try {
    //* Get the messages
    const messages = await language(req);
    //* List the unused activation codes
    let codes;
    if (req.user.role == process.env.MODERATOR_PERMISSIONS) {
      //* Get the academy ids for the moderator
      const userId = mongoose.Types.ObjectId.createFromHexString(req.user._id);
      //* Get the academy ids
      let academyIds = await User.aggregate([
        {
          $match: { _id: userId },
        },
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
        {
          $project: {
            academy_id: "$codes.academy_id",
          },
        },
      ]);
      const uniqueAcademyIds = [...new Set(academyIds.map((item) => item.academy_id))];
      //* Get the codes for the moderator
      codes = await Code.find({
        academy_id: { $in: uniqueAcademyIds },
        used: false,
      }).lean();
    } else {
      //* Get all codes for the admin
      codes = await Code.find({ used: false }).lean();
    }
    if (!codes) return sendErrorResponse(res, messages, "activation_code_list_failed");
    //* Get the academy name
    const academyIds = [...new Set(codes.map((code) => code.academy_id))];
    const academies = await Academy.find({ _id: { $in: academyIds } }).lean();
    if (!academies) return sendErrorResponse(res, messages, "academy_list_failed");
    const academyMap = academies.reduce((map, academy) => {
      map[academy._id] = academy.name;
      return map;
    }, {});
    //* Format the codes
    const formattedCodes = codes
      .map((code) => ({
        ...code,
        academy: academyMap[code.academy_id] || "Unknown academy",
        role: getRoleString(code.role, messages),
      }))
      .sort((a, b) => a.academy.localeCompare(b.academy));
    return res.status(200).json(formattedCodes);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/code/list/:id
 * @description Endpoint do pobierania szczegółowych informacji o kodzie aktywacyjnym na podstawie jego ID.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora lub administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID kodu aktywacyjnego, który ma zostać pobrany.
 *
 * @returns {Object} - Obiekt kodu aktywacyjnego zawierający szczegółowe informacje.
 * @returns {string} Res.code - Kod aktywacyjny.
 * @returns {string} Res.academy_id - ID akademii powiązanej z kodem.
 * @returns {number} Res.role - Rola powiązana z kodem.
 * @returns {boolean} Res.used - Status, czy kod został już użyty.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca szczegóły kodu aktywacyjnego.
 * @error {404} - Kod aktywacyjny nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/code/list/1234567890",{
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! List code by id
router.get("/list/:id", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* List the activation code by id
    const code = await Code.findById(req.params.id);
    if (!code) return sendErrorResponse(res, messages, "activation_code_list_failed");
    return res.status(200).json(code);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
