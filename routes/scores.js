const router = require("express").Router();
const User = require("../model/user");
const Score = require("../model/score");
const jwtMiddleware = require("../addons/jwt");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const { language } = require("../addons/language");
const userPermission = process.env.USER_PERMISSIONS;
const modPermission = process.env.MODERATOR_PERMISSIONS;

/**
 * @route GET /api/scores
 * @description Endpoint do renderowania widoku `scores` z danymi użytkownika. Na podstawie tokena JWT i roli użytkownika pobiera dane użytkownika z bazy danych oraz odpowiednie teksty językowe.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {number} req.user.role - Rola uwierzytelnionego użytkownika (USER, MODERATOR, ADMIN).
 *
 * @returns {HTML} - Zwraca renderowany widok `scores` z danymi użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Renderuje widok.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/scores", {
 *  method: "GET",
 *  headers: { "Content-Type": "application/json" }
 * });
 */
//! List scores for the user
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
    res.render("scores", {
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
 * @route GET /api/scores/list
 * @description Endpoint do pobierania listy wyników quizów użytkownika. Na podstawie ID użytkownika z tokena JWT pobiera i oblicza wyniki z bazy danych.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 *
 * @returns {Array<Object>} - Zwraca listę wyników quizów użytkownika ze szczegółowymi informacjami.
 * @returns {string} Res[].quiz_name - Nazwa quizu.
 * @returns {Object} Res[].score - Obiekt zawierający wynik quizu w tym:
 * @returns {number} Res[].score.correct - Liczba poprawnych odpowiedzi.
 * @returns {number} Res[].score.incorrect - Liczba niepoprawnych odpowiedzi.
 * @returns {number} Res[].score.total - Łączna liczba pytań.
 * @returns {Date} Res[].date_start - Data rozpoczęcia quizu.
 * @returns {Date} Res[].date_end - Data zakończenia quizu.
 * @returns {number} Res[].percentage - Procent poprawnych odpowiedzi w quizie.
 * @returns {string} Res[].time - Formatowany czas trwania quizu (hh:mm:ss).
 * @returns {number} Res[].average_percentage - Średni procent poprawnych odpowiedzi dla grupowania po quizach.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pomyślnie zwraca listę wyników użytkownika.
 * @error {404} - Wyniki użytkownika nie zostały znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/scores/list");
 */
//! List scores for the user
router.get("/list", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get scores from database
    const userId = req.user._id;
    let scores = await Score.aggregate([
      {
        $match: {
          user_id: userId,
        },
      },
      {
        $addFields: {
          quizObjectId: { $toObjectId: "$quiz_id" },
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "quizObjectId",
          foreignField: "_id",
          as: "quiz",
        },
      },
      {
        $unwind: {
          path: "$quiz",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: "$score",
      },
    ]);
    if (!scores || scores.length <= 0) return sendErrorResponse(res, messages, "scores_not_found");
    //* Calculate the average percentage
    const scoresWithPercentage = scores.map((score) => ({
      quiz_name: score.quiz ? score.quiz.name : null,
      score: score.score,
      date_start: score.date_start,
      date_end: score.date_end,
      percentage: score.score.total > 0 ? (score.score.correct / score.score.total) * 100 : 0,
    }));
    //* Group by quiz name and calculate the average percentage
    const quizAverages = scoresWithPercentage.reduce((acc, curr) => {
      if (!acc[curr.quiz_name]) {
        acc[curr.quiz_name] = { totalPercentage: 0, count: 0 };
      }
      acc[curr.quiz_name].totalPercentage += curr.percentage;
      acc[curr.quiz_name].count += 1;
      return acc;
    }, {});
    //* Calculate the average percentage for each quiz
    for (const quiz in quizAverages) {
      quizAverages[quiz].average_percentage =
        quizAverages[quiz].totalPercentage / quizAverages[quiz].count;
    }
    //* Add the average percentage to the scores
    const formattedResults = scoresWithPercentage.map((score) => {
      //* Calculate the quiz time
      const timeInMs = new Date(score.date_end) - new Date(score.date_start);
      const hours = Math.floor(timeInMs / (1000 * 60 * 60))
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((timeInMs % (1000 * 60 * 60)) / (1000 * 60))
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor((timeInMs % (1000 * 60)) / 1000)
        .toString()
        .padStart(2, "0");
      const formattedTime = `${hours}:${minutes}:${seconds}`;
      //* Return the data
      return {
        ...score,
        time: formattedTime,
        average_percentage: quizAverages[score.quiz_name].average_percentage,
      };
    });
    //* Send the scores
    res.status(200).send(formattedResults);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route GET /api/scores/list/:id
 * @description Endpoint do pobierania listy wyników quizów dla określonego użytkownika na podstawie jego ID. Wymaga uprawnień moderatora. Wyniki są grupowane według nazw quizów, a dla każdego quizu obliczana jest średnia procentowa poprawnych odpowiedzi.
 *
 * @middleware jwtMiddleware(modPermission) - Middleware sprawdzający uprawnienia moderatora.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.params.id - ID użytkownika, którego wyniki quizów mają zostać pobrane.
 *
 * @returns {Array<Object>} - Zwraca listę wyników quizów, pogrupowaną według quizów.
 * @returns {string} Res[].quiz_name - Nazwa quizu.
 * @returns {number} Res[].average_percentage - Średni procent poprawnych odpowiedzi dla quizu.
 * @returns {Array<Object>} Res[].scores - Lista wyników dla quizu w tym:
 * @returns {Date} Res[].scores.date_start - Data rozpoczęcia quizu.
 * @returns {Date} Res[].scores.date_end - Data zakończenia quizu.
 * @returns {number} Res[].scores.percentage - Procent poprawnych odpowiedzi w quizie.
 * @returns {Object} Res[].scores.score - Obiekt zawierający wynik quizu w tym:
 * @returns {number} Res[].scores.score.correct - Liczba poprawnych odpowiedzi.
 * @returns {number} Res[].scores.score.incorrect - Liczba niepoprawnych odpowiedzi.
 * @returns {number} Res[].scores.score.total - Łączna liczba pytań.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Pomyślnie zwraca listę wyników użytkownika.
 * @error {404} - Wyniki użytkownika nie zostały znalezione.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch("/api/scores/list/1234567890");
 */
//! List scores for admin or moderator
router.get("/list/:id", jwtMiddleware(modPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get scores from database
    const userId = req.params.id;
    let scores = await Score.aggregate([
      {
        $match: {
          user_id: userId,
        },
      },
      {
        $addFields: {
          quizObjectId: { $toObjectId: "$quiz_id" },
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "quizObjectId",
          foreignField: "_id",
          as: "quiz",
        },
      },
      {
        $unwind: {
          path: "$quiz",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: "$score",
      },
    ]);
    if (!scores || scores.length <= 0) return sendErrorResponse(res, messages, "scores_not_found");
    //* Calculate the average percentage
    const scoresWithPercentage = scores.map((score) => ({
      quiz_name: score.quiz ? score.quiz.name : null,
      score: score.score,
      date_start: score.date_start,
      date_end: score.date_end,
      percentage: score.score.total > 0 ? (score.score.correct / score.score.total) * 100 : 0,
    }));
    //* Group by quiz name
    const groupedScores = scoresWithPercentage.reduce((acc, curr) => {
      //* Check if the quiz name exists
      if (!acc[curr.quiz_name]) {
        acc[curr.quiz_name] = {
          quiz_name: curr.quiz_name,
          scores: [],
          average_percentage: 0,
        };
      }
      //* Add the score to the quiz
      acc[curr.quiz_name].scores.push({
        score: curr.score,
        date_start: curr.date_start,
        date_end: curr.date_end,
        percentage: curr.percentage,
      });

      return acc;
    }, {});
    //* Calculate the average percentage for each quiz
    for (const quiz in groupedScores) {
      const totalPercentage = groupedScores[quiz].scores.reduce(
        (sum, item) => sum + item.percentage,
        0
      );
      groupedScores[quiz].average_percentage = totalPercentage / groupedScores[quiz].scores.length;
    }
    const formattedResults = Object.values(groupedScores);
    //* Send the scores
    res.status(200).send(formattedResults);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
