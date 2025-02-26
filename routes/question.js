const router = require("express").Router();
const mongoose = require("mongoose");
const jwtMiddleware = require("../addons/jwt");
const { language } = require("../addons/language");
const Question = require("../model/question");
const Quiz = require("../model/quiz");
const User = require("../model/user");
const Code = require("../model/code");
const Score = require("../model/score");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { parseMarkdownQuiz, validateQuizData } = require("../addons/markdown");

/**
 * @route POST /api/question/add/:id
 * @description Endpoint do dodawania nowych pytań do istniejącego quizu przez moderatora. Pytania są parsowane, walidowane i dodawane do quizu, a licznik pytań w quizie jest aktualizowany.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID quizu, do którego dodawane jest pytanie.
 * @property {string} req.body.question - Pytanie w formacie Markdown do dodania.
 *
 * @returns {Object} - Obiekt wynikowy zawierający komunikat o powodzeniu lub błędzie, ID quizu oraz dodane pytanie.
 * @returns {string} Res.message - Komunikat o powodzeniu dodania pytania.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 * @returns {string} Res.id - ID quizu, do którego pytanie zostało dodane.
 * @returns {Object} Res.question - Obiekt dodanego pytania.
 *
 * @success {201} - Pytanie zostało pomyślnie dodane do quizu.
 * @error {400} - Błąd walidacji pytania lub błąd dodawania pytania do quizu.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/add/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ question: "Markdown question text" }),
 * });
 */
//! Add question
router.post("/add/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the questions
    let questions = parseMarkdownQuiz(req.body.question);
    questions = questions.map((question) => {
      question.quiz_id = req.params.id;
      return question;
    });
    questions = questions[0];
    //* Validate the questions
    const error = validateQuizData(questions);
    if (error) return sendErrorResponse(res, messages, error);
    //* Add the questions
    const question = await Question.create(questions);
    if (!question) return sendErrorResponse(res, messages, "question_add_failed");
    //* Update the quiz number of questions
    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id },
      { $inc: { question_count: 1 } }
    );
    if (!quiz) return sendErrorResponse(res, messages, "question_add_failed");
    //* Send the success message
    res
      .status(201)
      .send({ message: messages.success.question_added, id: quiz._id, question: question });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route DELETE /api/question/delete/:id
 * @description Endpoint do usuwania pytania z quizu. Aktualizuje licznik pytań w quizie po usunięciu.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID pytania, które ma zostać usunięte.
 *
 * @returns {Object} - Obiekt wynikowy zawierający komunikat o powodzeniu lub błędzie oraz ID quizu, z którego usunięto pytanie.
 * @returns {string} Res.message - Komunikat o powodzeniu usunięcia pytania.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 * @returns {string} Res.id - ID quizu, z którego usunięto pytanie.
 *
 * @success {200} - Pytanie zostało pomyślnie usunięte, a licznik pytań w quizie został zaktualizowany.
 * @error {404} - Pytanie lub quiz nie zostały znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/delete/1234567890`,{
 *  method: "DELETE"
 * });
 */
//! Delete question
router.delete("/delete/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Delete the question
    const question = await Question.findOneAndDelete({ _id: req.params.id });
    if (!question) return sendErrorResponse(res, messages, "question_delete_failed");
    //* Update the quiz number of questions
    const quiz = await Quiz.findOneAndUpdate(
      { _id: question.quiz_id },
      { $inc: { question_count: -1 } }
    );
    if (!quiz) return sendErrorResponse(res, messages, "question_delete_failed");
    //* Send the success message
    res.status(200).send({ message: messages.success.question_deleted, id: quiz._id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route PUT /api/question/update/:id
 * @description Endpoint do aktualizacji istniejącego pytania w quizie. Pytanie jest przetwarzane z formatu Markdown i zapisywane w bazie danych.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID pytania, które ma zostać zaktualizowane.
 * @property {string} req.body.question - Pytanie w formacie Markdown do aktualizacji.
 *
 * @returns {Object} Obiekt zawierający informacje o zaktualizowaniu semestrów:
 * @returns {string} Res.message - Komunikat o sukcesie lub błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pytanie zostało pomyślnie zaktualizowane.
 * @error {404} - Pytanie nie zostało znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/update/1234567890`, {
 *  method: "PUT",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ question: "Markdown question text" }),
 * })
 */
//! Update question
router.put("/update/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the question
    let questions = parseMarkdownQuiz(req.body.question);
    questions = questions[0];
    delete questions.created_at;
    const id = req.params.id;
    //* Update object
    const questionUpdated = await Question.findOneAndUpdate({ _id: id }, { $set: questions });
    if (!questionUpdated) return sendErrorResponse(res, messages, "question_update_failed");
    //* Send the success message
    const questionSuccess = messages.success.question_update_success;
    res.status(200).send({ message: questionSuccess });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/question/list/:id
 * @description Endpoint do pobierania listy pytań dla konkretnego quizu. Zwraca pytania oraz podstawowe informacje o quizie.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID quizu, dla którego pobierane są pytania.
 *
 * @returns {Object} - Obiekt zawierający:
 * @returns {Array<Object>} Res.questions - Tablica pytań w quizie.
 * @returns {Object} Res.quiz - Obiekt zawierający podstawowe informacje o quizie.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę pytań oraz informacje o quizie.
 * @error {404} - Nie znaleziono pytań lub quizu.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/list/1234567890`);
 */
//! List questions
router.get("/list/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the questions
    const questions = await Question.find({ quiz_id: req.params.id });
    if (!questions) return sendErrorResponse(res, messages, "questions_list_item_failed");
    //* Get the quiz
    const quiz = await Quiz.find({ _id: req.params.id });
    if (!quiz) return sendErrorResponse(res, messages, "questions_list_item_failed");
    //* Send the questions
    res.status(200).send({ questions, quiz });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @function getQuizIds
 * @description Funkcja pomocnicza do pobierania listy ID quizów dla moderatora.
 * @param {string} userId - ID użytkownika moderatora.
 * @returns {Array<string>} - Tablica ID quizów.
 * @returns {Array<string>} - Pusta tablica, jeśli nie znaleziono quizów.
 */
//! Get the quiz ids for the moderator
const getQuizIds = async (reqUserId) => {
  //* Get the academy ids for the moderator
  const userId = mongoose.Types.ObjectId.createFromHexString(reqUserId);
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
  if (!uniqueAcademyIds || uniqueAcademyIds.length <= 0)
    return sendErrorResponse(res, messages, "questions_list_item_failed");
  //* Get the quiz ids for the moderator
  const quizIds = await Quiz.find(
    {
      academy_id: { $in: uniqueAcademyIds },
    },
    { _id: 1 }
  );
  const uniqueQuizIds = [...new Set(quizIds.map((item) => item._id))];
  if (!uniqueQuizIds || uniqueQuizIds.length <= 0)
    return sendErrorResponse(res, messages, "questions_list_item_failed");
  return uniqueQuizIds;
};

/**
 * @route GET /api/question/reported
 * @description Endpoint do pobierania listy zgłoszonych pytań, które wymagają uwagi.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 *
 * @returns {Array<Object>} - Tablica obiektów zgłoszonych pytań.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę zgłoszonych pytań.
 * @error {404} - Nie znaleziono zgłoszonych pytań.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/reported`);
 */
//! List reported questions
router.get("/reported", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the questions
    let questions;
    if (req.user.role == process.env.ADMIN_PERMISSIONS) {
      questions = await Question.find({ reported: true });
      if (!questions) return sendErrorResponse(res, messages, "questions_list_item_failed");
    } else {
      //* Get the quiz IDs
      const uniqueQuizIds = await getQuizIds(req.user._id);
      //* Get the questions
      questions = await Question.find({
        quiz_id: { $in: uniqueQuizIds },
        reported: true,
      });
    }
    //* Send the questions
    res.status(200).send(questions);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/question/open
 * @description Endpoint do pobierania listy otwartych pytań z odpowiedziami wymagającymi sprawdzenia. Zawiera szczegóły odpowiedzi użytkowników oraz powiązane informacje o quizie.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 *
 * @returns {Array<Object>} - Tablica obiektów otwartych pytań z odpowiedziami użytkowników, w tym:
 * @returns {string} Res[].quiz_id - ID quizu, do którego pytanie należy.
 * @returns {string} Res[].quiz_name - Nazwa quizu.
 * @returns {string} Res[].question - Treść pytania.
 * @returns {Array<Object>} Res[].options - Tablica obiektów opcji odpowiedzi.
 * @returns {Array<Object>} Res[].answers - Tablica obiektów odpowiedzi użytkowników.
 * @returns {string} Res[].explanation - Wyjaśnienie odpowiedzi.
 * @returns {number} Res[].attempts - Liczba prób.
 * @returns {boolean} Res[].reported - Czy pytanie zostało zgłoszone.
 * @returns {Date} Res[].created_at - Data utworzenia pytania.
 * @returns {Date} Res[].updated_at - Data ostatniej aktualizacji pytania.
 * @returns {ObjectId} Res[].answer_db - ID bazy danych odpowiedzi.
 * @returns {string} Res[].user_email - Adres e-mail użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę otwartych pytań z odpowiedziami użytkowników.
 * @error {404} - Nie znaleziono pytań.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/open`);
 */
//! List open questions
router.get("/open", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the question IDs and relevant user and quiz info
    let questionIds;
    if (req.user.role == process.env.ADMIN_PERMISSIONS) {
      questionIds = await Score.aggregate([
        { $unwind: "$questions" },
        {
          $match: {
            "questions.checked": false,
            "questions.answer_ids": { $size: 1 },
          },
        },
        {
          $project: {
            _id: 1,
            question_id: "$questions.question_id",
            user_answer: "$questions.answer_ids.user_text",
            answer_id: "$questions.answer_ids.answer_id",
            user_id: "$user_id",
            quiz_id: "$quiz_id",
          },
        },
      ]);
    } else {
      //* Get the quiz IDs
      const uniqueQuizIds = await getQuizIds(req.user._id);
      const stringQuizIds = uniqueQuizIds.map((id) => id.toString());
      //* Get the question IDs
      questionIds = await Score.aggregate([
        { $unwind: "$questions" },
        {
          $match: {
            "questions.checked": false,
            "questions.answer_ids": { $size: 1 },
            quiz_id: { $in: stringQuizIds },
          },
        },
        {
          $project: {
            _id: 1,
            question_id: "$questions.question_id",
            user_answer: "$questions.answer_ids.user_text",
            answer_id: "$questions.answer_ids.answer_id",
            user_id: "$user_id",
            quiz_id: "$quiz_id",
          },
        },
      ]);
    }
    //* Check if there are any questions
    if (!questionIds || questionIds.length === 0) return res.status(200).send([]);
    //* Extract unique question IDs
    const uniqueQuestionIds = [...new Set(questionIds.map((q) => q.question_id))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    //* Fetch unique questions
    let uniqueQuestions = await Question.find({ _id: { $in: uniqueQuestionIds } });
    if (!uniqueQuestions || uniqueQuestions.length === 0)
      return sendErrorResponse(res, messages, "questions_list_item_failed");
    //* Map unique questions by ID for easy access
    const uniqueQuestionsMap = uniqueQuestions.reduce((acc, question) => {
      acc[question._id.toString()] = question.toObject();
      return acc;
    }, {});
    //* Get unique user IDs and quiz IDs
    const userIds = [...new Set(questionIds.map((q) => q.user_id))];
    const quizIds = [...new Set(questionIds.map((q) => q.quiz_id))];
    //* Fetch user emails and quiz names
    const users = await User.find({ _id: { $in: userIds } }, { email: 1 });
    const quizzes = await Quiz.find({ _id: { $in: quizIds } }, { name: 1 });
    //* Create dictionaries for quick lookup
    const userDict = users.reduce((acc, user) => {
      acc[user._id.toString()] = user.email;
      return acc;
    }, {});
    const quizDict = quizzes.reduce((acc, quiz) => {
      acc[quiz._id.toString()] = quiz.name;
      return acc;
    }, {});
    //* Construct the final list of questions
    const questions = questionIds.map((q) => {
      const questionCopy = { ...uniqueQuestionsMap[q.question_id.toString()] };
      //* Replace the answers array with only the specific user's answer
      questionCopy.answers = [
        {
          answer_id: q.answer_id,
          is_correct: false,
          options: [{}],
          answer: q.user_answer,
        },
      ];
      //* Add user email, quiz name, and answer database ID
      questionCopy.answer_db = q._id;
      questionCopy.user_email = userDict[q.user_id.toString()] || messages.info.unknown_user;
      questionCopy.quiz_name = quizDict[q.quiz_id.toString()] || messages.info.unknown_quiz;
      return questionCopy;
    });
    //* Send the questions with user email and quiz name
    res.status(200).send(questions);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/question/open/:id
 * @description Endpoint do aktualizacji statusu otwartego pytania na sprawdzone. Ustawia stan odpowiedzi użytkownika jako poprawny lub niepoprawny i aktualizuje wynik quizu.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID odpowiedzi użytkownika, która ma zostać sprawdzona.
 * @property {boolean} req.body.state - Stan odpowiedzi użytkownika (`true` dla poprawnej, `false` dla niepoprawnej).
 *
 * @returns {Object} Zwraca obiekt z komunikatem o powodzeniu lub błędzie:
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pytanie zostało pomyślnie oznaczone jako sprawdzone.
 * @error {404} - Pytanie nie zostało znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/question/open/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 *  body: JSON.stringify({ state: true }),
 * })
 */
//! Accept or decline open question
router.post("/open/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the state
    const state = req.body.state;
    //* Get the question
    const questions = await Score.findOne({ _id: req.params.id });
    if (!questions) return sendErrorResponse(res, messages, "question_not_found");
    //* Check if the question is already checked
    const question_id = req.body.question_id;
    const question = questions.questions.find(
      (q) => q.checked === false && q.question_id === question_id
    );
    if (!question) return sendErrorResponse(res, messages, "question_not_found");
    //* Update the question
    question.checked = true;
    question.answer_ids[0].user_correct = state;
    if (state) {
      questions.score[0].correct += 1;
      questions.score[0].incorrect -= 1;
    }
    //* Save the question
    await questions.save();
    //* Send the success message
    const questionSuccess = messages.success.question_checked;
    res.status(200).send({ message: questionSuccess });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route PUT /api/question/decline/:id
 * @description Endpoint do odrzucania zgłoszenia pytania. Ustawia status pytania jako niezgłoszone, gdy moderator uzna, że zgłoszenie jest niezasadne.
 *
 * @middleware jwtMiddleware(process.env.MODERATOR_PERMISSIONS) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID pytania, którego zgłoszenie ma zostać odrzucone.
 *
 * @returns {Object} Zwraca obiekt z komunikatem o powodzeniu lub błędzie:
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pytanie zostało pomyślnie oznaczone jako niezgłoszone.
 * @error {404} - Pytanie nie zostało znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * axios.put('/api/question/decline/12345')
 *   .then(response => console.log(response.data))
 *   .catch(error => console.error(error));
 */
//! Decline reported question
router.put("/decline/:id", jwtMiddleware(process.env.MODERATOR_PERMISSIONS), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Decline the question
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { reported: false } }
    );
    if (!question) return sendErrorResponse(res, messages, "question_decline_failed");
    //* Send the success message
    const questionSuccess = messages.success.question_declined;
    res.status(200).send({ message: questionSuccess });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
