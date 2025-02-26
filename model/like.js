const mongoose = require("mongoose");

/**
 * Schemat polubienia quizu w bazie danych.
 *
 * @typedef {Object} Like
 * @property {string} _id - Identyfikator polubienia quizu (ObjectId w formacie string).
 * @property {string} user_id - Wymagany identyfikator użytkownika (od 6 do 255 znaków).
 * @property {string} quiz_id - Wymagany identyfikator quizu (od 6 do 255 znaków).
 * @property {Date} date - Data polubienia quizu.
 */
//! Like Schema
const likeSchema = new mongoose.Schema({
  user_id: { type: String, min: 6, max: 255, required: true },
  quiz_id: { type: String, min: 6, max: 255, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Likes", likeSchema);
