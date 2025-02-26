const router = require("express").Router();
const mongoose = require("mongoose");
const jwtMiddleware = require("../addons/jwt");
const { language } = require("../addons/language");
const User = require("../model/user");
const Academy = require("../model/academy");
const Quiz = require("../model/quiz");
const Question = require("../model/question");
const Like = require("../model/like");
const Notification = require("../model/notification");
const Score = require("../model/score");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { extractError } = require("../addons/extractError");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { quizValidation, quizNameValidation, quizTermsValidation } = require("../addons/validation");
const { parseMarkdownQuiz, validateQuizData } = require("../addons/markdown");

/**
 * @route POST /api/quiz/start/:id
 * @description Endpoint do uruchamiania quizu. Wybiera pytania na podstawie ustawień oraz renderuje widok `quiz`.
 *
 * @middleware jwtMiddleware(process.env.USER_PERMISSIONS) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID quizu, który ma zostać uruchomiony.
 * @property {boolean} req.body.quiz_checkbox_autosave - Ustawienie dla automatycznego zapisu.
 * @property {boolean} req.body.quiz_checkbox_explanation - Ustawienie dla wyjaśnień pytań.
 * @property {boolean} req.body.quiz_checkbox_livecheck - Ustawienie dla sprawdzania odpowiedzi na żywo.
 * @property {boolean} req.body.quiz_checkbox_open_question - Czy dozwolone są pytania otwarte.
 * @property {boolean} req.body.quiz_checkbox_random - Czy pytania mają być wybrane losowo.
 * @property {number} req.body.quiz_question_count - Liczba pytań do wyświetlenia w quizie.
 *
 * @returns {HTML} - Renderowany widok `quiz` z wybranymi pytaniami i ustawieniami.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Renderuje widok.
 * @error {400} - Brak wymaganej liczby pytań lub nieznaleziony quiz.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/start/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    quiz_checkbox_autosave: true,
 *    quiz_checkbox_explanation: true,
 *    quiz_checkbox_livecheck: true,
 *    quiz_checkbox_open_question: true,
 *    quiz_checkbox_random: true,
 *    quiz_question_count: 20,
 *  });
 * });
 */
//! Start quiz
router.post("/start/:id", jwtMiddleware(process.env.USER_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Set questions settings
    const settings = {
      question_count: req.body.quiz_question_count,
      random: req.body.quiz_checkbox_random,
      open_question: req.body.quiz_checkbox_open_question,
    };
    if (settings.question_count < 2) return sendErrorResponse(res, messages, "quiz_question_count");
    //* Get the quiz id
    const quizId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
    //* Get the quiz and increase the view counter
    const quiz = await Quiz.findOneAndUpdate({ _id: quizId, public: true }, { $inc: { view: 1 } });
    if (!quiz) return sendErrorResponse(res, messages, "quiz_not_found");
    //* Get the questions
    let questions,
      quizIdQuestion = req.params.id;
    //* Set the match conditions
    const matchConditions = { quiz_id: quizIdQuestion, reported: false };
    //* Check if open questions are allowed
    if (settings.open_question === false)
      matchConditions.options = { $not: { $elemMatch: { type: "open" } } };
    if (settings.random) {
      //* Random questions
      questions = await Question.aggregate([
        { $match: matchConditions },
        { $sample: { size: settings.question_count } },
      ]);
    } else {
      //* Normal questions
      questions = await Question.find(matchConditions)
        .sort({ _id: 1 })
        .limit(settings.question_count);
    }
    //* Check if questions exist
    if (!questions || questions.length <= 1)
      return sendErrorResponse(res, messages, "questions_not_found");
    res.render("quiz", {
      language: req.language,
      messages: messages.texts,
      livecheck: req.body.quiz_checkbox_livecheck,
      explanation: req.body.quiz_checkbox_explanation,
      autosave: req.body.quiz_checkbox_autosave,
      quiz: quiz,
      questions: questions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/quiz/add
 * @description Endpoint do dodawania nowego quizu. Pobiera informacje o quizie, weryfikuje unikalność nazwy, waliduje dane i zapisuje quiz oraz pytania do bazy danych.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 * @middleware upload.single("file") - Middleware do obsługi przesyłania pojedynczego pliku z pytaniami w formacie Markdown.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.name - Nazwa quizu (musi być unikalna).
 * @property {string} req.body.academy - ID akademii, do której quiz należy.
 * @property {string} req.body.terms - Semestry quizu, rozdzielone przecinkami.
 * @property {Object} req.file - Przesłany plik z pytaniami do quizu w formacie Markdown.
 *
 * @returns {Object} Obiekt zawierający informacje o dodaniu quizu:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {201} - Quiz został pomyślnie utworzony.
 * @error {400} - Błąd walidacji danych lub problem z unikalnością nazwy quizu.
 * @error {404} - Nie znaleziono akademii powiązanej z quizem.
 * @error {404} - Quiz nie zawiera pytań.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * const formData = new FormData();
 * formData.append("file", file[0]);
 * formData.append("name", "Nazwa quizu");
 * formData.append("academy", "1234567890");
 * formData.append("terms", "1,2,3");
 * await fetch("/api/quiz/add", {
 *  method: "POST",
 *  body: formData,
 * });
 */
//! Add quiz
router.post(
  "/add",
  jwtMiddleware(process.env.MODERATOR_PERMISSIONS),
  upload.single("file"),
  async (req, res) => {
    try {
      //* Get the messages
      const messages = await language(req);
      //* Get the file
      const file = req.file;
      //* Check the terms
      const processedTerms = [
        ...new Set(
          req.body.terms
            .split(",")
            .map((term) => parseInt(term))
            .sort()
        ),
      ];
      req.body.terms = processedTerms;
      //* Validate the data
      const { error } = quizValidation(req.body);
      if (error) {
        //* Get the error code and message
        let errorCode = extractError(error);
        //* Special check form terms array values
        const isTermInvalid = /^max_\d{1,2}$/.test(errorCode) || /^min_\d{1,2}$/.test(errorCode);
        if (isTermInvalid && parseInt(errorCode.match(/\d+/)[0], 10) <= 14) errorCode = "base_term";
        return sendErrorResponse(res, messages, errorCode);
      }
      //* Check if the academy exists
      const academy = await Academy.findOne({
        _id: mongoose.Types.ObjectId.createFromHexString(req.body.academy),
      });
      if (!academy) return sendErrorResponse(res, messages, "academy_not_found");
      //* Check if the name is unique
      const quizExists = await Quiz.findOne({ name: req.body.name });
      if (quizExists) return sendErrorResponse(res, messages, "quiz_name_exists");
      //* Read the file
      const fileContent = file.buffer.toString("utf-8");
      let quizData = parseMarkdownQuiz(fileContent);
      if (!quizData.length) return sendErrorResponse(res, messages, "quiz_no_questions");
      //* Validate the data
      for (const question of quizData) {
        const error = validateQuizData(question);
        if (error) return sendErrorResponse(res, messages, error);
      }
      //* Save the data to the database
      const quiz = {
        name: req.body.name,
        term: req.body.terms,
        academy_id: req.body.academy,
        question_count: quizData.length,
      };
      const newQuiz = await Quiz.create(quiz);
      if (!newQuiz) return sendErrorResponse(res, messages, "quiz_create_failed");
      const quiz_id = newQuiz._id;
      //* Save the questions
      quizData.map((question) => {
        question.quiz_id = quiz_id;
      });
      const newQuestions = await Question.insertMany(quizData);
      if (!newQuestions) return sendErrorResponse(res, messages, "quiz_questions_create_failed");
      const quizSuccess = messages.success.quiz_added;
      res.status(201).send({ message: quizSuccess });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error");
    }
  }
);

/**
 * @route POST /api/quiz/delete/:id
 * @description Endpoint do usuwania quizu. Usuwa quiz, powiązane pytania oraz polubienia quizu na podstawie podanego ID.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {Object} req.params.id - ID quizu do usunięcia.
 *
 * @returns {Object} Obiekt zawierający informacje o usunięciu quizu:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Quiz został pomyślnie usunięty wraz z powiązanymi pytaniami i polubieniami.
 * @error {404} - Quiz nie został znaleziony.
 * @error {400} - Pytania lub polubienia quizu nie zostały usunięte.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/delete/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 * });
 */
//! Delete quiz
router.post("/delete/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Delete the quiz
    const quizId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
    const quizExist = await Quiz.findByIdAndDelete(quizId);
    if (!quizExist) return sendErrorResponse(res, messages, "quiz_not_found");
    //* Delete the questions
    const deletedQuestions = await Question.deleteMany({ quiz_id: req.params.id });
    if (!deletedQuestions) return sendErrorResponse(res, messages, "quiz_questions_delete_failed");
    //* Delete the likes
    const deletedLikes = await Like.deleteMany({ quiz_id: req.params.id });
    if (!deletedLikes) return sendErrorResponse(res, messages, "quiz_likes_delete_failed");
    //* Send the response
    const quizDeleteSuccess = messages.success.quiz_deleted;
    return res.status(200).send({ message: quizDeleteSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/quiz/list
 * @description Endpoint do pobierania listy quizów. Dla moderatora pobierane są quizy przypisane do akademii, z którą jest związany; administratorzy widzą wszystkie quizy.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 *
 * @returns {Array<Object>} - Lista quizów z informacjami o akademii, w tym:
 * @returns {string} Res[].name - Nazwa quizu.
 * @returns {string} Res[].academy_id - ID akademii, do której należy quiz.
 * @returns {Date} Res[].created_at - Data utworzenia quizu.
 * @returns {Date} Res[].updated_at - Data ostatniej aktualizacji quizu.
 * @returns {boolean} Res[].public - Czy quiz jest publiczny.
 * @returns {number} Res[].view - Liczba wyświetleń quizu.
 * @returns {number} Res[].question_count - Liczba pytań w quizie.
 * @returns {Array<Object>} Res[].terms[] - Lista semestrów, do których należy quiz.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca sformatowaną listę quizów.
 * @error {404} - Nie znaleziono quizów lub akademii.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/quiz/list");
 */
//! Get quiz list
router.get("/list", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    let quizzes;
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
      //* Get the quizzes for the moderator
      quizzes = await Quiz.find({
        academy_id: { $in: uniqueAcademyIds },
      })
        .sort({ created_at: -1 })
        .lean();
    } else {
      //* Get all quizzes
      quizzes = await Quiz.find().sort({ created_at: -1 }).lean();
    }
    if (!quizzes) return sendErrorResponse(res, messages, "quiz_not_found");
    //* Get the academy name
    const academyIds = [...new Set(quizzes.map((quiz) => quiz.academy_id))];
    const academies = await Academy.find({ _id: { $in: academyIds } }).lean();
    if (!academies) return sendErrorResponse(res, messages, "academy_list_failed");
    const academyMap = academies.reduce((map, academy) => {
      map[academy._id] = academy.name;
      return map;
    }, {});
    //* Format the quizzes
    const formattedQuizzes = quizzes
      .map((quiz) => ({
        ...quiz,
        academy: academyMap[quiz.academy_id] || "Unknown academy",
      }))
      .sort((a, b) => b.created_at - a.created_at);
    res.status(200).send(formattedQuizzes);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/quiz/list/:id
 * @description Endpoint do pobierania szczegółowych informacji o quizie na podstawie jego ID.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID quizu, który ma zostać pobrany.
 *
 * @returns {string} Res.name - Nazwa quizu.
 * @returns {string} Res.academy_id - ID akademii, do której należy quiz.
 * @returns {Date} Res.created_at - Data utworzenia quizu.
 * @returns {Date} Res.updated_at - Data ostatniej aktualizacji quizu.
 * @returns {boolean} Res.public - Czy quiz jest publiczny.
 * @returns {number} Res.view - Liczba wyświetleń quizu.
 * @returns {number} Res.question_count - Liczba pytań w quizie.
 * @returns {Array<Object>} Res.terms[] - Lista semestrów, do których należy quiz.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca obiekt quizu z jego szczegółowymi informacjami.
 * @error {404} - Quiz o podanym ID nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/list/1234567890`)
 */
//! List quiz by id
router.get("/list/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* List the quiz by id
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return sendErrorResponse(res, messages, "quiz_list_item_failed");
    return res.status(200).json(quiz);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/quiz/edit/:id
 * @description Endpoint do edycji właściwości quizu (nazwa lub terminy) przez moderatora. Waliduje dane przed aktualizacją i sprawdza unikalność nazwy.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.body.value - Nowa wartość właściwości quizu (nazwa lub terminy).
 * @property {string} req.params.id - ID quizu, który ma zostać zaktualizowany.
 * @property {string} req.body.field - Nazwa pola do edycji (`name` lub `term`).
 *
 * @returns {Object} Obiekt zawierający informacje o edycji quizu:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Quiz został pomyślnie zmodyfikowany.
 * @error {400} - Brak wymaganych danych lub nieprawidłowe pole do edycji.
 * @error {404} - Quiz o podanej nazwie już istnieje.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/edit/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({
 *    value: "Nowa nazwa quizu",
 *    field: "name",
 *  }),
 * })
 */
//! Update quiz
router.post("/edit/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the body
    let body = {
      value: req.body.value.trim(),
      id: req.params.id,
      field: req.body.field,
    };
    if (body.value === "" || body.id === "" || body.field === "")
      return sendErrorResponse(res, messages, "bad_request");
    //* Validate the data before changing the quiz
    switch (body.field) {
      case "name":
        var { error } = quizNameValidation({
          name: body.value,
        });
        break;
      case "term":
        const terms = [
          ...new Set(
            body.value
              .split(",")
              .map((term) => parseInt(term))
              .sort()
          ),
        ];
        body.value = terms;
        var { error } = quizTermsValidation({
          terms: terms,
        });
        break;
      default:
        return sendErrorResponse(res, messages, "bad_request");
    }
    if (error) {
      //* Get the error code and message
      let errorCode = extractError(error);
      //* Special check form terms array values
      const isTermInvalid = /^max_\d{1,2}$/.test(errorCode) || /^min_\d{1,2}$/.test(errorCode);
      if (isTermInvalid && parseInt(errorCode.match(/\d+/)[0], 10) <= 14) errorCode = "base_term";
      return sendErrorResponse(res, messages, errorCode);
    }
    //* Checking if the quiz name is already in the database
    if (body.field == "name") {
      const quizExist = await Quiz.findOne({ [body.field]: body.value });
      if (quizExist) return sendErrorResponse(res, messages, "quiz_modify_exist");
    }
    //* Modify the quiz
    const modifiedQuiz = await Quiz.updateOne({ _id: req.params.id }, { [body.field]: body.value });
    if (!modifiedQuiz) return sendErrorResponse(res, messages, "quiz_modify_failed");
    const quizModifiedSuccess = messages.success.quiz_modified;
    return res.status(200).send({ message: quizModifiedSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/quiz/public/:id
 * @description Endpoint do publikowania lub wycofywania quizu. W zależności od aktualnego statusu publikacji quizu, zmienia jego status na publiczny lub prywatny.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID quizu, którego status ma zostać zmieniony.
 *
 * @returns {Object} Obiekt zawierający informacje o statusie publikacji quizu:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Quiz został pomyślnie opublikowany lub wycofany.
 * @error {404} - Quiz nie został znaleziony.
 * @error {400} - Błąd publikacji quizu.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/public/1234567890`, {
 *  method: "POST",
 * });
 */
//! Publish quiz
router.post("/public/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Checking if the quiz is already in the database
    const quizExist = await Quiz.findOne({ _id: req.params.id });
    if (!quizExist) return sendErrorResponse(res, messages, "quiz_not_found");
    //* Publish / unpublish the quiz
    const status = !quizExist.public;
    const modifiedQuiz = await Quiz.updateOne({ _id: req.params.id }, { public: status });
    if (!modifiedQuiz) return sendErrorResponse(res, messages, "quiz_publish_failed");
    const quizPublishSuccess =
      status == true ? messages.success.quiz_published : messages.success.quiz_unpublished;
    return res.status(200).send({ message: quizPublishSuccess, status: status });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/quiz/report/:id
 * @description Endpoint do zgłaszania pytania jako niepoprawne przez użytkownika. Zmienia status pytania na zgłoszone oraz wysyła powiadomienie.
 *
 * @middleware jwtMiddleware(process.env.USER_PERMISSIONS) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID pytania, które ma zostać zgłoszone.
 *
 * @returns {Object} Obiekt zawierający informacje o zgłoszeniu pytania:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pytanie zostało pomyślnie zgłoszone i wysłano powiadomienie.
 * @error {400} - Pytanie zostało już zgłoszone wcześniej.
 * @error {404} - Pytanie nie zostało znalezione.
 * @error {400} - Błąd wysyłania powiadomienia.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/report/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 * });
 */
//! Report quiz
router.post("/report/:id", jwtMiddleware(process.env.USER_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Checking if the quiz is already in the database
    const questionExist = await Question.findOne({ _id: req.params.id });
    if (!questionExist) return sendErrorResponse(res, messages, "question_not_found");
    if (questionExist.reported == true)
      return sendErrorResponse(res, messages, "question_already_reported");
    //* Report the quiz
    const reportedQuestion = await Question.findOneAndUpdate(
      { _id: req.params.id },
      { reported: true }
    );
    if (!reportedQuestion) return sendErrorResponse(res, messages, "question_report_failed");
    //* Get the user email
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "question_report_failed");
    //* Send notification
    const notification = new Notification({
      email: user.email,
      content: `${messages.success.question_reported}: ${questionExist.question}`,
    });
    const savedNotification = await notification.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Send the response
    const quizReportSuccess = messages.success.question_reported;
    return res.status(200).send({ message: quizReportSuccess });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/quiz/check/:id
 * @description Endpoint do sprawdzania poprawności odpowiedzi na pytanie. Na podstawie ID pytania i podanej odpowiedzi zwraca wynik oraz liczbę pozostałych prób.
 *
 * @middleware jwtMiddleware(process.env.USER_PERMISSIONS) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID pytania, którego odpowiedź jest sprawdzana.
 * @property {string} req.body.answer - ID odpowiedzi udzielonej przez użytkownika.
 * @property {number} req.body.left - Liczba pozostałych prób.
 *
 * @returns {Object} - Obiekt wynikowy zawierający wynik poprawności odpowiedzi i zaktualizowaną liczbę pozostałych prób.
 * @returns {boolean} Res.correct - Czy odpowiedź jest poprawna.
 * @returns {number} Res.left - Zaktualizowana liczba pozostałych prób.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca wynik poprawności odpowiedzi oraz liczbę pozostałych prób.
 * @error {404} - Pytanie nie zostało znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/check/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ answer: "0987654321", left: 3 }),
 * });
 */
//! Check answer
router.post("/check/:id", jwtMiddleware(process.env.USER_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Checking if the question is already in the database
    const questionId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
    const question = await Question.findOne({ _id: questionId });
    if (!question) return sendErrorResponse(res, messages, "question_not_found");
    //* Available left attempts
    let attemptsLeft = parseInt(req.body.left);
    //* Check the answer
    const correctAnswer = question.answers.some(
      (answer) => answer.answer_id == req.body.answer && answer.is_correct
    );
    attemptsLeft = correctAnswer == true ? attemptsLeft - 1 : 0;
    return res.status(200).send({ correct: correctAnswer, left: attemptsLeft });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/quiz/save/:id
 * @description Endpoint do zapisywania wyniku quizu dla użytkownika. Oblicza wynik, porównuje odpowiedzi użytkownika z poprawnymi odpowiedziami i zapisuje wynik wraz ze szczegółami podejścia.
 *
 * @middleware jwtMiddleware(process.env.USER_PERMISSIONS) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID quizu, którego wynik jest zapisywany.
 * @property {number} req.body.time - Czas trwania quizu w sekundach.
 * @property {Array<Object>} req.body.data - Tablica obiektów z odpowiedziami użytkownika.
 * @property {number} req.body.score - Wynik użytkownika, który jest walidowany z obliczonym wynikiem.
 * @property {boolean} req.body.livecheck - Flaga wskazująca, czy wynik powinien być weryfikowany w czasie rzeczywistym.
 *
 * @returns {Redirect} - Przekierowuje do `/api/scores` z wynikami użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {302} - Pomyślnie zapisuje wynik quizu i przekierowuje do `/api/scores`.
 * @error {400} - Wynik użytkownika nie zgadza się z obliczonym wynikiem.
 * @error {400} - Błąd walidacji danych.
 * @error {404} - Quiz lub pytania nie zostały znalezione.
 * @error {400} - Błąd wysyłania powiadomienia.
 * @error {500} - Błąd serwera.
 * @redirect {302} - Przekierowuje do `/api/scores`.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/quiz/save/1234567890`, {
 *   time: 1200,
 *   data: [
 *    {
 *      question_id: "abc123", answer_ids: [{
 *        answer_id: "ans1", is_correct: true, user_correct: true, user_text: null
 *      }],
 *      checked: true
 *    },
 *    {
 *      question_id: "def456", answer_ids: [{
 *        answer_id: "ans2", is_correct: false, user_correct: false, user_text: null
 *      }],
 *      checked: false
 *    },
 *   ],
 *   score: 5,
 *   livecheck: true
 * });
 */
//! Save quiz
router.post("/save/:id", jwtMiddleware(process.env.USER_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Checking if the quiz is already in the database
    const quizId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
    const quiz = await Quiz.findOne({ _id: quizId });
    if (!quiz) return sendErrorResponse(res, messages, "quiz_not_found");
    //* Format the time
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - req.body.time * 1000);
    //* Set questions data
    const userQuestions = req.body.data;
    //* Get the questions
    const questions = await Question.find({ quiz_id: req.params.id });
    if (!questions) return sendErrorResponse(res, messages, "questions_not_found");
    //* Set the score
    let scoreValidation = 0,
      scoreUser = 0;
    //* Format the data
    userQuestions.forEach((question) => {
      //* Check correct answers
      const correctAnswers = questions
        .find((item) => item._id == question.question_id)
        .answers.filter((answer) => answer.is_correct)
        .map((answer) => answer.answer_id);
      //* Check if the answer is correct
      question.answer_ids.forEach((answer) => {
        answer.is_correct = correctAnswers.includes(answer.answer_id);
        //* Open question
        if (question.answer_ids.length === 1) {
          answer.user_correct = false;
          question.checked = false;
        } else {
          question.checked = true;
        }
        //* Check if the answer is correct
        if (answer.is_correct) {
          scoreValidation++;
          if (answer.user_correct === answer.is_correct) scoreUser++;
        }
      });
    });
    //* Check if the score is correct
    if (parseInt(req.body.score) !== scoreUser && req.body.livecheck)
      return sendErrorResponse(res, messages, "quiz_score_mismatch");
    //* Set the data
    const data = {
      quiz_id: req.params.id,
      user_id: req.user._id,
      score: [
        {
          correct: scoreUser,
          incorrect: scoreValidation - scoreUser,
          total: scoreValidation,
        },
      ],
      question_count: userQuestions.length,
      questions: req.body.data,
      date_start: startDate,
      date_end: endDate,
    };
    //* Save the data
    const newScore = await Score.create(data);
    if (!newScore) return sendErrorResponse(res, messages, "score_create_failed");
    //* Update attempts in questions
    const questionIds = userQuestions.map(
      (question) => new mongoose.Types.ObjectId(question.question_id)
    );
    const attempts = await Question.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { attempts: 1 } }
    );
    if (!attempts) return sendErrorResponse(res, messages, "score_attempts_failed");
    //* Get the user email
    const user = await User.findOne({ _id: req.user._id });
    if (!user) return sendErrorResponse(res, messages, "score_attempts_failed");
    //* Send notification
    const notification = new Notification({
      email: user.email,
      content: `${messages.success.quiz_finished} ${((scoreUser / scoreValidation) * 100).toFixed(
        2
      )}% (${scoreUser}/${scoreValidation}) - ${quiz.name}`,
    });
    const savedNotification = await notification.save();
    if (!savedNotification) return sendErrorResponse(res, messages, "send_notification_failed");
    //* Show the results in scores
    return res.redirect("/api/scores");
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
