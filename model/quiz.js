const mongoose = require("mongoose");

/**
 * Schemat quizu w bazie danych.
 *
 * @typedef {Object} Quiz
 * @property {string} _id - Identyfikator quizu (ObjectId w formacie string).
 * @property {string} academy_id - Wymagany identyfikator akademii.
 * @property {Array<number>} term - Wymagana tablica semestrów przypisanych do quizu.
 * @property {string} name - Wymagana nazwa quizu (od 6 do 255 znaków).
 * @property {number} view - Liczba wyświetleń quizu.
 * @property {number} question_count - Liczba pytań w quizie.
 * @property {boolean} public - Flaga informująca, czy quiz jest publiczny.
 * @property {Date} created_at - Data utworzenia quizu.
 * @property {Date} updated_at - Data aktualizacji quizu.
 */
//! Quiz Schema
const quizSchema = new mongoose.Schema({
  academy_id: { type: String, required: true },
  term: { type: Array, default: [], required: true },
  name: { type: String, default: "", min: 6, max: 255, required: true },
  view: { type: Number, default: 0 },
  question_count: { type: Number, default: 0 },
  public: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Quiz", quizSchema);
