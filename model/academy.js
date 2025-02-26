const mongoose = require("mongoose");

/**
 * Schemat akademii w bazie danych.
 *
 * @typedef {Object} Academy
 * @property {string} _id - Identyfikator akademii (ObjectId w formacie string).
 * @property {string} name - Nazwa akademii (od 6 do 255 znaków).
 * @property {string} code - Kod akademii (od 2 do 16 znaków).
 * @property {number} user_count - Liczba użytkowników w akademii.
 * @property {Date} date - Data utworzenia akademii.
 */
//! Academy Schema
const academySchema = new mongoose.Schema({
  name: { type: String, default: "", min: 6, max: 255 },
  code: { type: String, default: "", min: 2, max: 16 },
  user_count: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Academy", academySchema);
