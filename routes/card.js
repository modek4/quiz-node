const router = require("express").Router();
const { language } = require("../addons/language");
const mongoose = require("mongoose");
const Quiz = require("../model/quiz");
const User = require("../model/user");
const Like = require("../model/like");
const jwtMiddleware = require("../addons/jwt");
const { sendErrorResponse } = require("../addons/sendErrorResponse");
const userPermission = process.env.USER_PERMISSIONS;

/**
 * @route GET /api/card
 * @description Endpoint do pobierania listy quizów dostępnych dla użytkownika na podstawie jego akademii, semestru i uprawnień. Zawiera także informację o polubionych quizach.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {string} req.query.academy_id - ID akademii, dla której pobierane są quizy.
 *
 * @returns {Array<Object>} - Tablica obiektów quizów dostępnych dla użytkownika.
 * @returns {string} Res[].academy_id - ID akademii powiązanej z quizem.
 * @returns {Array<number>} Res[].term - Lista semestrów powiązanych z quizem.
 * @returns {boolean} Res[].public - Status dostępności quizu.
 * @returns {boolean} Res[].liked - Czy quiz został polubiony przez użytkownika.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Zwraca listę quizów dostępnych dla użytkownika.
 * @error {400} - Brak ID akademii.
 * @error {404} - Użytkownik nie został znaleziony.
 * @error {500} - Błąd serwera.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/card?academy_id=0987654321`);
 */
//! The main route for the card
router.get("/", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Declare the query
    const userId = mongoose.Types.ObjectId.createFromHexString(req.user._id);
    let usersQuery = [
      { $match: { _id: userId } },
      {
        $lookup: {
          from: "codes",
          localField: "code",
          foreignField: "code",
          as: "codes",
        },
      },
      { $unwind: "$codes" },
    ];
    //* Get user from database
    let user = await User.aggregate(usersQuery);
    if (!user) return sendErrorResponse(res, messages, "user_not_found");
    user = user[0];
    //* Get the likes
    const likes = (await Like.find({ user_id: req.user._id }).lean()) || [];
    //* Get the academy id
    const academy_id = req.query.academy_id;
    if (!academy_id) return sendErrorResponse(res, messages, "academy_id_missing");
    //* Check if the user is admin or moderator
    const isAccess =
      user.role == process.env.ADMIN_PERMISSIONS || user.role == process.env.MODERATOR_PERMISSIONS;
    //* Set the query
    let query = {
      academy_id: { $in: academy_id },
      public: isAccess ? { $in: [true, false] } : true,
    };
    if (!isAccess) {
      const term = user.codes.term;
      query.term = { $in: term };
    }
    //* Get the quizzes
    let quizzes = await Quiz.find(query).lean();
    //* Add the liked field
    quizzes = quizzes.map((quiz) => {
      const like = likes.find((like) => like.quiz_id.toString() === quiz._id.toString());
      return {
        ...quiz,
        liked: like ? true : false,
      };
    });
    res.status(200).send(quizzes);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/**
 * @route POST /api/card/like/:id
 * @description Endpoint do polubienia lub usunięcia polubienia quizu przez użytkownika. Jeśli quiz nie jest jeszcze polubiony przez użytkownika, dodaje polubienie, a jeśli jest już polubiony, usuwa polubienie.
 *
 * @middleware jwtMiddleware(userPermission) - Middleware sprawdzający uprawnienia użytkownika.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 * @property {string} req.user._id - ID uwierzytelnionego użytkownika.
 * @property {string} req.params.id - ID quizu, który ma zostać polubiony lub odlubiony.
 *
 * @returns {Object} Zwraca obiekt błedu.
 * @returns {string} Res.message - Komunikat o błędzie.
 * @returns {string} Res.description - Opis błędu.
 * @returns {number} Res.status - Status odpowiedzi HTTP.
 *
 * @success {200} - Quiz został polubiony lub odlubiony pomyślnie.
 * @error {404} - Quiz nie został znaleziony.
 * @error {500} - Błąd serwera przy tworzeniu lub usuwaniu polubienia.
 *
 * @example
 * // Przykładowe wywołanie
 * await fetch(`/api/card/like/1234567890`, {
 *  method: "POST",
 *  headers: { "Content-Type": "application/json" },
 * });
 */
//! Like a quiz
router.post("/like/:id", jwtMiddleware(userPermission), async (req, res) => {
  try {
    //* Get the messages
    const messages = await language(req);
    //* Get the like
    const like = await Like.findOne({ user_id: req.user._id, quiz_id: req.params.id });
    if (!like) {
      //* Create the like
      const newLike = Like.create({ user_id: req.user._id, quiz_id: req.params.id });
      if (!newLike) return sendErrorResponse(res, messages, "quiz_like_create_failed");
    } else {
      //* Delete the like
      const deleteLike = await Like.deleteOne({ user_id: req.user._id, quiz_id: req.params.id });
      if (!deleteLike) return sendErrorResponse(res, messages, "quiz_like_delete_failed");
    }
    res.status(200).send("Quiz liked");
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
