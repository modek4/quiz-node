const router = require("express").Router();
const Academy = require("../model/academy");
const Code = require("../model/code");
const User = require("../model/user");
const mongoose = require("mongoose");
const jwtMiddleware = require("../addons/jwt");
const { extractError } = require("../addons/extractError");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const {
  academyValidation,
  academyNameValidation,
  academyCodeValidation,
} = require("../addons/validation");
const { language } = require("../addons/language");
const adminPermission = process.env.ADMIN_PERMISSIONS;
const modPermission = process.env.MODERATOR_PERMISSIONS;

/**
 * @route POST /api/academy/create
 * @description Endpoint do tworzenia nowej akademii przez administratora. Waliduje dane wejściowe, sprawdza, czy akademia już istnieje, a następnie zapisuje nową akademię w bazie danych.
 *
 * @middleware jwtMiddleware(adminPermission) - Middleware sprawdzający uprawnienia administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.name - Nazwa nowej akademii.
 * @property {string} req.body.code - Kod akademii.
 *
 * @returns {Object} Obiektem z komunikatem o sukcesie lub błędzie utworzenia akademii.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {201} - Akademia została pomyślnie utworzona.
 * @error {400} - Błąd walidacji danych lub akademia już istnieje.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/academy/create", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    name: "Nazwa Akademii",
 *    code: "NA",
 *  }),
 * });
 */
//! Create academy
router.post("/create", jwtMiddleware(adminPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Validate the data before we make a user
    const { error } = academyValidation(req.body);
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Checking if the academy is already in the database
    const academyExist = await Academy.findOne({ name: req.body.name.trim() });
    if (academyExist) return sendErrorResponse(res, messages, "academy_exist");
    //* Create a new academy
    const academy = new Academy({
      name: req.body.name.trim(),
      code: req.body.code.trim(),
    });
    //* Create the academy
    const savedAcademy = await academy.save();
    if (!savedAcademy) return sendErrorResponse(res, messages, "academy_add_failed");
    const savedAcademySuccess = messages.success.academy_added;
    return res.status(201).send({ message: savedAcademySuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/academy/edit
 * @description Endpoint do edycji informacji o akademii przez moderatora. Waliduje nowe dane, sprawdza, czy wartość nie jest już przypisana do innej akademii, a następnie aktualizuje wybrane pole.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.value - Nowa wartość do aktualizacji (nazwa lub kod akademii).
 * @property {string} req.body.id - ID akademii, która ma zostać edytowana.
 * @property {string} req.body.field - Pole akademii do edycji ("name" lub "code").
 *
 * @returns {Object} Obiektem z komunikatem o sukcesie lub błędzie aktualizacji akademii.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Akademia została pomyślnie zaktualizowana.
 * @error {400} - Nieprawidłowe dane wejściowe lub nieznane pole do edycji.
 * @error {404} - Akademia z danymi już istnieje.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/academy/edit", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    value: "Nowa Nazwa Akademii",
 *    id: "1234567890",
 *    field: "name",
 *  }),
 * });
 */
//! Edit academy
router.post("/edit", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the body
    const body = {
      value: req.body.value.trim(),
      id: req.body.id,
      field: req.body.field,
    };
    if (body.value === "" || body.id === "" || body.field === "")
      return sendErrorResponse(res, messages, "bad_request");
    //* Validate the data before changing the academy
    switch (body.field) {
      case "name":
        var { error } = academyNameValidation({
          name: body.value,
        });
        break;
      case "code":
        var { error } = academyCodeValidation({
          code: body.value,
        });
        break;
      default:
        return sendErrorResponse(res, messages, "bad_request");
    }
    if (error) return sendErrorResponse(res, messages, extractError(error));
    //* Checking if the academy is already in the database
    const academyExist = await Academy.findOne({ [body.field]: body.value });
    if (academyExist) return sendErrorResponse(res, messages, "academy_modify_exist");
    //* Modify the academy
    const modifiedAcademy = await Academy.updateOne(
      { _id: req.body.id },
      { [body.field]: body.value }
    );
    if (!modifiedAcademy) return sendErrorResponse(res, messages, "academy_modify_failed");
    const academyModifiedSuccess = messages.success.academy_modified;
    return res.status(200).send({ message: academyModifiedSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/academy/delete/:id
 * @description Endpoint do usuwania akademii przez administratora. Sprawdza, czy akademia istnieje oraz czy nie jest przypisana do żadnych użytkowników, a następnie usuwa akademię i nieużywane kody.
 *
 * @middleware jwtMiddleware(adminPermission) - Middleware sprawdzający uprawnienia administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID akademii do usunięcia.
 *
 * @returns {Object} Obiektem z komunikatem o sukcesie lub błędzie usunięcia akademii.
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Akademia i jej nieużywane kody zostały pomyślnie usunięte.
 * @error {400} - Akademia zawiera przypisanych użytkowników i nie może zostać usunięta.
 * @error {404} - Akademia nie istnieje.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/academy/delete/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 * });
 */
//! Delete academy
router.post("/delete/:id", jwtMiddleware(adminPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Checking if the academy is already in the database
    const academyExist = await Academy.findOne({ _id: req.params.id });
    if (!academyExist) return sendErrorResponse(res, messages, "academy_not_exist");
    //* Checking if the academy has users
    if (academyExist.user_count > 0) return sendErrorResponse(res, messages, "academy_has_users");
    //* Delete unused codes
    const deletedCodes = await Code.deleteMany({ academy_id: req.params.id }, { used: false });
    if (!deletedCodes) return sendErrorResponse(res, messages, "codes_delete_failed");
    //* Delete the academy
    const deletedAcademy = await Academy.deleteOne({ _id: req.params.id });
    if (!deletedAcademy) return sendErrorResponse(res, messages, "academy_delete_failed");
    const deletedAcademySuccess = messages.success.academy_deleted;
    return res.status(200).send({ message: deletedAcademySuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/academy/list
 * @description Endpoint do pobierania listy akademii dostępnych dla użytkownika. Moderatorzy widzą tylko akademie, z którymi są powiązani, natomiast administratorzy mają dostęp do wszystkich akademii.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora lub administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (MODERATOR lub ADMIN).
 *
 * @returns {Array<Object>} - Tablica obiektów akademii.
 * @returns {string} Res[].name - Nazwa akademii.
 * @returns {string} Res[]._id - ID akademii.
 * @returns {number} Res[].user_count - Liczba użytkowników przypisanych do akademii.
 * @returns {string} Res[].code - Kod akademii.
 * @returns {date} Res[].date - Data utworzenia akademii.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę akademii dostępnych dla użytkownika.
 * @error {404} - Brak akademii do wyświetlenia.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/academy/list");
 */
//! List academy
router.get("/list", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* List the academies
    let academies;
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
      //* Get the academies for the moderator
      academies = await Academy.find({
        _id: { $in: uniqueAcademyIds },
      }).sort({ name: 1 });
    } else {
      //* Get all academies for the admin
      academies = await Academy.find().sort({ name: 1 });
    }
    if (!academies) return sendErrorResponse(res, messages, "academy_list_failed");
    return res.status(200).json(academies);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/academy/list/:id
 * @description Endpoint do pobierania informacji o konkretnej akademii na podstawie jej ID. Dostępny dla moderatorów i administratorów.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora lub administratora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID akademii do pobrania informacji.
 *
 * @returns {Object} - Obiekt akademii zawierający szczegółowe informacje.
 * @returns {string} Res.name - Nazwa akademii.
 * @returns {string} Res._id - ID akademii.
 * @returns {number} Res.user_count - Liczba użytkowników przypisanych do akademii.
 * @returns {string} Res.code - Kod akademii.
 * @returns {date} Res.date - Data utworzenia akademii.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca szczegóły akademii.
 * @error {404} - Akademia nie została znaleziona.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/academy/list/1234567890`);
 */
//! List academy by id
router.get("/list/:id", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* List the academy by id
    const academy = await Academy.findById(req.params.id);
    if (!academy) return sendErrorResponse(res, messages, "academy_list_item_failed");
    return res.status(200).json(academy);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
