import { listQuizzes } from "./addons/quiz.js";
import { listAcademies } from "./addons/academy.js";
import { listCodes } from "./addons/code.js";
import { listUsers } from "./addons/user.js";
import { toggleElements } from "./addons/content.js";

/**
 * Inicjalizuje panel administracyjny, uruchamiając wszystkie niezbędne funkcje po załadowaniu zawartości strony.
 *
 * @function initPanel
 * @see {@link toggleElements} - Funkcja przełączająca elementy.
 * @see {@link listQuizzes} - Funkcja listująca quizy.
 * @see {@link listAcademies} - Funkcja listująca akademie.
 * @see {@link listCodes} - Funkcja listująca kody.
 * @see {@link listUsers} - Funkcja listująca użytkowników.
 * @returns {Promise<void[]>} Obietnica, która rozwiązuje się, gdy wszystkie funkcje zostaną uruchomione.
 * @throws {Error} Jeśli wystąpi błąd podczas inicjalizacji.
 */
//! Initialize admin panel
export const initPanel = () => {
  return Promise.all([
    toggleElements(),
    listQuizzes(),
    listAcademies(["table", "select", "quiz"]),
    listCodes("table"),
    listUsers(),
  ]);
};
