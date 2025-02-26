const mongoose = require("mongoose");

//! Selfcheck events
const events = [
  //* Check environment variables
  async () => {
    console.log("Checking environment variables...");
    const requiredEnv = [
      "PORT",
      "HOST",
      "TOKEN_SECRET",
      "USER_PERMISSIONS",
      "MODERATOR_PERMISSIONS",
      "ADMIN_PERMISSIONS",
    ]; //? Add more environment variables if needed
    const missingEnv = requiredEnv.filter((env) => !process.env[env]);
    if (missingEnv.length > 0) {
      console.log("Missing environment variables:", missingEnv);
      return false;
    }
    return true;
  },
  //* Connect to database
  async () => {
    console.log("Connecting to database...");
    return connectDB(process.env.MONGO_URI);
  },
  //* Check database connection
  async () => {
    console.log("Checking database connection...");
    return mongoose.connection.readyState === 1;
  },
  //* Check if the database is populated
  async () => {
    console.log("Checking if the database is populated...");
    const User = require("../model/user");
    const user = await User.findOne();
    return !!user;
  },
  //* Check if the JSON files are present
  async () => {
    console.log("Checking if the JSON files are present...");
    const fs = require("fs");
    const path = require("path");
    const files = fs.readdirSync(path.join(__dirname, "../languages/"));
    const requiredFiles = ["pl.json", "en.json"]; //? Add more languages if needed
    const missingFiles = requiredFiles.filter((file) => !files.includes(file));
    if (missingFiles.length > 0) {
      console.log("Missing JSON files:", missingFiles);
      return false;
    }
    return true;
  },
];

/**
 * Funkcja łącząca się z bazą danych MongoDB.
 *
 * @async
 * @function connectDB
 * @param {string} [uri=null] - URI bazy danych MongoDB.
 * @throws {Error} Jeśli wystąpi błąd podczas łączenia z bazą danych.
 * @returns {Promise<boolean>} Obietnica, która rozwiązuje się do wartości true, jeśli połączenie się powiedzie, lub false, jeśli wystąpi błąd.
 */
//! Connect to MongoDB
async function connectDB(uri = null) {
  if (uri == null) {
    console.log("No URI provided");
    return false;
  }
  try {
    await mongoose.connect(uri);
    return true;
  } catch (err) {
    console.log(err);
  }
}

/**
 * Aktualizuje pasek postępu.
 *
 * @async
 * @function updateProgressBar
 * @param {number} percent - Procent ukończenia.
 * @param {number} total - Całkowita liczba zdarzeń.
 * @property {number} barLength - Długość paska postępu.
 * @property {number} filledLength - Długość wypełnienia paska postępu.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zaktualizowaniu paska postępu.
 */
//! Update progress bar
const updateProgressBar = async (percent, total) => {
  const barLength = 50;
  const filledLength = Math.round((percent / total) * barLength);
  const percentValue = Math.round((percent / total) * 100);
  const bar = "█".repeat(filledLength) + "-".repeat(barLength - filledLength);
  console.log(`\r[${bar}] ${percentValue}%`);
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Wykonuje samosprawdzenie aplikacji, uruchamiając szereg zdarzeń i aktualizując pasek postępu.
 *
 * @async
 * @function runSelfCheck
 * @property {number} totalEvents - Całkowita liczba zdarzeń.
 * @property {number} completedEvents - Liczba zakończonych zdarzeń.
 * @property {boolean} failedEvents - Flaga informująca o niepowodzeniu któregoś z zdarzeń.
 * @property {boolean} result - Wynik samosprawdzenia.
 * @property {Object[]} events - Tablica zdarzeń do wykonania
 * @property {Function} updateProgressBar - Funkcja aktualizująca pasek postępu.
 * @throws {Error} Jeśli wystąpi błąd podczas wykonywania zdarzeń.
 * @returns {Promise<boolean>} Obietnica, która rozwiązuje się do wartości true, jeśli wszystkie zdarzenia zakończą się powodzeniem, lub false, jeśli którykolwiek z nich się nie powiedzie.
 */
//! Selfcheck
const runSelfCheck = async () => {
  //* Progress bar
  const totalEvents = events.length;
  let completedEvents = 0;
  //* Failed events
  let failedEvents = false;
  await updateProgressBar(completedEvents, totalEvents);
  //* Run events
  for (const event of events) {
    try {
      const result = await event();
      if (!result) {
        console.log("Failed during event... Exiting selfcheck.");
        failedEvents = true;
        break;
      }
    } catch (error) {
      console.log("Error occurred:", error.message);
      break;
    }
    completedEvents++;
    await updateProgressBar(completedEvents, totalEvents);
  }
  //* Check if all events passed
  if (failedEvents) return false;
  return true;
};

exports.runSelfCheck = runSelfCheck;
