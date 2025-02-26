const mongoose = require("mongoose");

/**
 * Schemat ustawień użytkownika w bazie danych.
 *
 * @typedef {Object} Setting
 * @property {string} _id - Identyfikator ustawień (ObjectId w formacie string).
 * @property {string} user_id - Wymagany identyfikator użytkownika.
 * @property {string} academy_id - Wymagany identyfikator akademii.
 * @property {string} display - Wyświetlanie pytań (od 2 do 255 znaków, domyślnie "grid").
 * @property {string} sort - Sortowanie pytań (od 2 do 255 znaków, domyślnie "recent").
 * @property {boolean} darkmode - Tryb ciemny (domyślnie false).
 * @property {boolean} autosave - Automatyczne zapisywanie (domyślnie true).
 * @property {boolean} explanation - Wyświetlanie wyjaśnień (domyślnie true).
 * @property {boolean} open_question - Otwarte pytania (domyślnie true).
 * @property {boolean} random - Losowa kolejność pytań (domyślnie true).
 * @property {boolean} livecheck - Sprawdzanie odpowiedzi na żywo (domyślnie true).
 */

//! Setting Schema
const settingSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  academy_id: { type: String, required: true },
  display: { type: String, required: true, min: 2, max: 255, default: "grid" },
  sort: { type: String, required: true, min: 2, max: 255, default: "recent" },
  darkmode: { type: Boolean, default: false },
  autosave: { type: Boolean, default: true },
  explanation: { type: Boolean, default: true },
  open_question: { type: Boolean, default: true },
  random: { type: Boolean, default: true },
  livecheck: { type: Boolean, default: true },
});

module.exports = mongoose.model("Setting", settingSchema);
