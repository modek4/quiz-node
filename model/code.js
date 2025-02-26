const mongoose = require("mongoose");

/**
 * Schemat kodu aktywacyjnego w bazie danych.
 *
 * @typedef {Object} Code
 * @property {string} _id - Identyfikator kodu (ObjectId w formacie string).
 * @property {string} code - Kod aktywacyjny (8 znaków).
 * @property {boolean} used - Flaga informująca, czy kod został użyty.
 * @property {Array<number>} term - Tablica semestrów przypisanych do kodu.
 * @property {string} academy_id - Identyfikator akademii (od 6 do 255 znaków).
 * @property {number} role - Rola przypisana do kodu (domyślnie uprawnienia użytkownika).
 * @property {Date} date - Data utworzenia kodu.
 */
//! Code Schema
const codeSchema = new mongoose.Schema({
  code: { type: String, default: "", length: 8 },
  used: { type: Boolean, default: false },
  term: { type: Array, default: [] },
  academy_id: { type: String, default: "", min: 6, max: 255 },
  role: { type: Number, default: process.env.USER_PERMISSIONS },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Codes", codeSchema);
