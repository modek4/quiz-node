const mongoose = require("mongoose");

/**
 * Schemat wyniku quizu w bazie danych.
 *
 * @typedef {Object} Score
 * @property {string} _id - Identyfikator wyniku quizu (ObjectId w formacie string).
 * @property {string} quiz_id - Wymagany identyfikator quizu.
 * @property {string} user_id - Wymagany identyfikator użytkownika.
 * @property {Array<Object>} score - Wynik quizu.
 * @property {number} score.correct - Liczba poprawnych odpowiedzi.
 * @property {number} score.incorrect - Liczba niepoprawnych odpowiedzi.
 * @property {number} score.total - Całkowita liczba pytań.
 * @property {number} question_count - Wymagana liczba pytań w quizie.
 * @property {Array<Object>} questions - Tablica pytań.
 * @property {string} questions.question_id - Wymagany identyfikator pytania.
 * @property {boolean} questions.checked - Flaga informująca, czy pytanie zostało sprawdzone.
 * @property {Array<Object>} questions.answer_ids - Tablica identyfikatorów odpowiedzi.
 * @property {string} questions.answer_ids.answer_id - Wymagany identyfikator odpowiedzi.
 * @property {boolean} questions.answer_ids.is_correct - Flaga informująca, czy odpowiedź jest poprawna.
 * @property {boolean} questions.answer_ids.user_correct - Flaga informująca, czy odpowiedź użytkownika jest poprawna.
 * @property {string} questions.answer_ids.user_text - Tekst odpowiedzi użytkownika (od 2 do 2048 znaków).
 * @property {Date} date_start - Data rozpoczęcia quizu.
 * @property {Date} date_end - Data zakończenia quizu.
 */
//! Score Schema
const scoreSchema = new mongoose.Schema({
  quiz_id: { type: String, required: true },
  user_id: { type: String, required: true },
  score: [
    {
      correct: { type: Number, default: 0, required: true },
      incorrect: { type: Number, default: 0, required: true },
      total: { type: Number, default: 0, required: true },
    },
  ],
  question_count: { type: Number, default: 0, required: true },
  questions: [
    {
      question_id: { type: String, required: true },
      checked: { type: Boolean, default: false },
      answer_ids: [
        {
          answer_id: { type: String, required: true },
          is_correct: { type: Boolean, default: false },
          user_correct: { type: Boolean, default: false },
          user_text: { type: String, default: "", min: 2, max: 2048 },
        },
      ],
    },
  ],
  date_start: { type: Date, default: Date.now },
  date_end: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Score", scoreSchema);
