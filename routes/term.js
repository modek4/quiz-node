const router = require("express").Router();
const jwtMiddleware = require("../addons/jwt");
const Code = require("../model/code");
const moongoose = require("mongoose");
const { extractError } = require("../addons/extractError");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { language } = require("../addons/language");
const { editTermValidation } = require("../addons/validation");
const modPermission = process.env.MODERATOR_PERMISSIONS;

/**
 * @route POST /api/term/edit
 * @description Endpoint do edycji semestrów w kodzie aktywacynym użytkownika. Sprawdza poprawność semestrów, uprawnienia użytkownika i aktualizuje wartość w bazie danych.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.id - ID kodu aktywacyjnego, który ma zostać zaktualizowany.
 * @property {string} req.body.field - Nazwa pola, które ma zostać zaktualizowane.
 * @property {string} req.body.value - Nowa wartość semestrów (jako ciąg liczb oddzielonych przecinkami).
 * @property {number} req.user.role - Poziom roli użytkownika.
 *
 * @returns {Object} Obiekt zawierający informacje o zaktualizowaniu semestrów:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca komunikat o pomyślnej aktualizacji semestrów.
 * @error {400} - Niepoprawny format semestrów lub brakujące dane.
 * @error {403} - Użytkownik nie ma uprawnień do edycji semestrów innego użytkownika.
 * @error {404} - Semestr lub użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * await fetch("/api/term/edit", {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ value: "1,2,3", id: "1234567890", field: "terms" }),
 * });
 */
//! Edit term
router.post("/edit", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Check if the term has only numbers and commas
    let terms = req.body.value.trim();
    const termRegex = /^[0-9, ]+$/;
    if (!termRegex.test(terms)) return sendErrorResponse(res, messages, "term_invalid");
    //* Remove duplicates and sort the terms
    terms = [
      ...new Set(
        terms
          .split(",")
          .map((term) => parseInt(term))
          .sort()
      ),
    ];
    //* Get the body
    const body = {
      value: terms,
      id: req.body.id,
      field: req.body.field,
    };
    if (body.value === "" || body.id === "" || body.field === "")
      return sendErrorResponse(res, messages, "bad_request");
    //* Validate the data before changing the term
    const { error } = editTermValidation({ term: terms });
    if (error) {
      //* Get the error code and message
      let errorCode = extractError(error);
      //* Special check form terms array values
      const isTermInvalid = /^max_\d{1,2}$/.test(errorCode) || /^min_\d{1,2}$/.test(errorCode);
      if (isTermInvalid && parseInt(errorCode.match(/\d+/)[0], 10) <= 14) errorCode = "base_term";
      return sendErrorResponse(res, messages, errorCode);
    }
    //* Check if user has permission to edit the term for other user
    const userId = moongoose.Types.ObjectId.createFromHexString(body.id);
    let user = await Code.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: "users",
          localField: "code",
          foreignField: "code",
          as: "users",
        },
      },
      {
        $unwind: "$users",
      },
    ]);
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    user = user[0];
    if (req.user.role == modPermission && user.users.role > req.user.role)
      return sendErrorResponse(res, messages, "term_modify_permission");
    //* Update the term
    const updatedTerm = await Code.findByIdAndUpdate(
      body.id,
      {
        [body.field]: body.value,
      },
      { new: true }
    );
    if (!updatedTerm) return sendErrorResponse(res, messages, "term_modify_failed");
    const updatedTermSuccess = messages.success.term_modified;
    return res.status(200).send({ message: updatedTermSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/term/list/:id
 * @description Endpoint do pobierania listy semestrów według ID kodu aktywacyjnego.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID kodu, na podstawie którego są pobierane semestry.
 *
 * @returns {Object} terms - Zwraca sformatowany obiekt semestrów dla danego kodu.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pomyślnie zwraca obiekt semestrów.
 * @error {404} - Nie znaleziono semestrów dla danego ID kodu aktywacyjnego.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/term/list/1234567890`);
 */
//! List term by id
router.get("/list/:id", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* List the terms by code id
    const terms = await Code.findById(req.params.id);
    if (!terms) return sendErrorResponse(res, messages, "term_list_item_failed");
    //* Return the terms as an object
    const formattedTerms = terms.toObject();
    return res.status(200).json(formattedTerms);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
