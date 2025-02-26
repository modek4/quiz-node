import { loadQuestions, loadOpenQuestions } from "./question.js";

/**
 * Inicjalizuje zgłoszenia, ładując je i otwarte pytania.
 *
 * @async
 * @function initReport
 * @see {@link loadQuestions} - Funkcja ładująca zgłoszenia.
 * @see {@link loadOpenQuestions} - Funkcja ładująca otwarte pytania.
 * @returns {Promise<void[]>} Obietnica, która rozwiązuje się po załadowaniu pytań i otwartych pytań.
 */
//! Load necessary functions
export const initReport = () => {
  return Promise.all([loadQuestions(true), loadOpenQuestions()]);
};
