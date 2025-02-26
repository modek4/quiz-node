const mongoose = require("mongoose");

/**
 * Schemat powiadomienia w bazie danych.
 *
 * @typedef {Object} Notification
 * @property {string} _id - Identyfikator powiadomienia (ObjectId w formacie string).
 * @property {string} email - Adres e-mail użytkownika (od 6 do 255 znaków).
 * @property {string} content - Treść powiadomienia (od 1 do 1024 znaków).
 * @property {Date} date - Data utworzenia powiadomienia.
 * @property {boolean} read - Flaga informująca, czy powiadomienie zostało przeczytane.
 */
//! Notification Schema
const notificationSchema = new mongoose.Schema({
  email: { type: String, required: true, min: 6, max: 255 },
  content: { type: String, required: true, min: 1, max: 1024 },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

module.exports = mongoose.model("Notification", notificationSchema);
