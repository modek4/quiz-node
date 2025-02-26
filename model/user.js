const mongoose = require("mongoose");

/**
 * Schemat użytkownika w bazie danych.
 *
 * @typedef {Object} User
 * @property {string} _id - Identyfikator użytkownika (ObjectId w formacie string).
 * @property {string} name - Wymagane imię użytkownika (od 3 do 255 znaków).
 * @property {string} email - Wymagany adres e-mail użytkownika (od 6 do 255 znaków).
 * @property {string} password - Wymagane hasło użytkownika (od 8 do 1024 znaków).
 * @property {Date} date - Data utworzenia konta użytkownika.
 * @property {Date} last_login - Data ostatniego logowania użytkownika.
 * @property {number} role - Rola użytkownika (domyślnie uprawnienia użytkownika).
 * @property {string} code - Kod aktywacyjny użytkownika.
 * @property {boolean} blocked - Flaga informująca, czy użytkownik jest zablokowany.
 */
//! User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, min: 3, max: 255 },
  email: { type: String, required: true, min: 6, max: 255 },
  password: { type: String, required: true, min: 8, max: 1024 },
  date: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now },
  role: { type: Number, default: process.env.USER_PERMISSIONS },
  code: { type: String, default: "" },
  blocked: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
