const mongoose = require("mongoose");

/**
 * Schemat pytania quizu w bazie danych.
 *
 * @typedef {Object} Question
 * @property {string} _id - Identyfikator pytania (ObjectId w formacie string).
 * @property {string} quiz_id - Wymagany identyfikator quizu.
 * @property {string} question - Wymagana treść pytania (od 2 do 2048 znaków).
 * @property {Array<Object>} options - Opcje pytania.
 * @property {Array<Object>} answers - Tablica odpowiedzi.
 * @property {string} answers.answer_id - Wymagany identyfikator odpowiedzi.
 * @property {string} answers.answer - Wymagana treść odpowiedzi (od 2 do 2048 znaków).
 * @property {Array<Object>} answers.options - Opcje odpowiedzi.
 * @property {boolean} answers.is_correct - Flaga informująca, czy odpowiedź jest poprawna.
 * @property {string} explanation - Wyjaśnienie pytania (od 2 do 4096 znaków).
 * @property {number} attempts - Liczba prób.
 * @property {boolean} reported - Flaga informująca, czy pytanie zostało zgłoszone.
 * @property {Date} created_at - Data utworzenia pytania.
 * @property {Date} updated_at - Data aktualizacji pytania.
 */
//! Question Schema
const questionSchema = new mongoose.Schema({
  quiz_id: { type: String, required: true },
  question: { type: String, default: "", min: 2, max: 2048, required: true },
  options: { type: Array, default: [] },
  answers: [
    {
      answer_id: { type: String, required: true },
      answer: { type: String, default: "", min: 2, max: 2048, required: true },
      options: { type: Array, default: [] },
      is_correct: { type: Boolean, default: false },
    },
  ],
  explanation: { type: String, default: "", min: 2, max: 4096 },
  attempts: { type: Number, default: 0 },
  reported: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Question", questionSchema);
