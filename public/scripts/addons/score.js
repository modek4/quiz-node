import { showMessage, messages } from "./messages.js";
import { createTable } from "./table.js";
import { getSVG } from "./svg.js";

/**
 * Inicjalizuje tabelę wyników.
 *
 * @async
 * @function initScore
 * @see {@link listScores} - Funkcja listująca wyniki.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po załadowaniu wyników.
 */
//! Load necessary functions
export const initScore = () => {
  return Promise.all([listScores()]);
};

/**
 * Tworzy tabelę wyników na podstawie danych.
 *
 * @async
 * @function createScoresTable
 * @see {@link createTable} - Funkcja tworząca tabelę.
 * @see {@link getSVG} - Funkcja pobierająca kod SVG.
 * @param {Object[]} data - Tablica danych do wyświetlenia w tabeli.
 * @param {string} tbody - Selektor elementu tbody.
 * @property {HTMLElement} target - Element docelowy tabeli.
 * @property {string} trendingDownSVG - Kod SVG ikony trendu spadkowego.
 * @property {string} trendingUpSVG - Kod SVG ikony trendu wzrostowego.
 * @property {string} clockSVG - Kod SVG ikony zegara.
 * @property {string} calendarSVG - Kod SVG ikony kalendarza.
 * @property {string} noQuizName - Tekst informujący o braku nazwy quizu.
 * @property {Function} createRow - Funkcja tworząca wiersz tabeli.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu tabeli wyników.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy tabeli nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Create scores table
const createScoresTable = async (data, tbody) => {
  //* Check if target exists
  const target = document.querySelector(tbody);
  const targetError = messages.errors.scores_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Clear target
  target.innerHTML = "";
  //* Get SVGs
  const trendingDownSVG = getSVG("trendingDown");
  const trendingUpSVG = getSVG("trendingUp");
  const clockSVG = getSVG("clock");
  const calendarSVG = getSVG("calendar");
  const noQuizName = messages.texts.scores_table_name_null;
  //* Sort data by date
  data.sort((a, b) => new Date(b.date_end) - new Date(a.date_end));
  //* List of all elements
  const createRow = (item) => ({
    tag: "tr",
    attributes: { role: "row" },
    classes: [item.quiz_name == null ? "deleted" : "scores-table-body-item"],
    children: [
      //* Quiz name
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-scores-name-table",
        },
        content: item.quiz_name == null ? noQuizName : item.quiz_name,
      },
      //* Score
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-scores-score-table",
        },
        dataset: {
          label: `${messages.texts.scores_table_score}: `,
        },
        children: [
          {
            tag: "p",
            children: [
              {
                tag: "p",
                content: `(${item.score.correct}/${item.score.total})`,
              },
              {
                tag: "span",
                content: `${item.percentage.toFixed(2)}` || `0`,
              },
            ],
          },
        ],
      },
      //* Date
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-scores-date-table",
        },
        dataset: {
          label: `${messages.texts.scores_table_date}: `,
        },
        children: [
          {
            tag: "p",
            content: `${calendarSVG} ${new Date(item.date_end).toLocaleDateString()}`,
          },
        ],
      },
      //* Time
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-scores-time-table",
        },
        dataset: {
          label: `${messages.texts.scores_table_time}: `,
        },
        children: [
          {
            tag: "p",
            content: `${clockSVG} ${item.time}`,
          },
        ],
      },
      //* Progress bar
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-scores-avg-table",
        },
        dataset: {
          label: `${messages.texts.scores_table_avg}: `,
        },
        children: [
          {
            tag: "p",
            children: [
              {
                tag: "span",
                dataset: {
                  value: item.percentage - item.average_percentage > 0 ? "+" : item.percentage - item.average_percentage == 0 ? " " : "-",
                },
                content: Math.abs(item.percentage - item.average_percentage)
                  .toFixed(2)
                  .toString(),
              },
              {
                tag: "progress",
                attributes: {
                  value: Math.abs(item.percentage - item.average_percentage),
                  max: 100,
                  min: 0,
                },
                classes: [item.percentage - item.average_percentage > 0 ? "correct" : "incorrect"],
              },
              {
                tag: "p",
                content:
                  item.percentage - item.average_percentage > 0 ? trendingUpSVG : trendingDownSVG,
              },
            ],
          },
        ],
      },
    ],
  });
  createTable({
    data: data || [],
    target: target,
    firstRow: false,
    colNumbers: 6,
    createRow: createRow,
  });
  return Promise.resolve();
};

/**
 * Listuje wyniki użytkownika.
 *
 * @async
 * @function listScores
 * @see {@link createScoresTable} - Funkcja tworząca tabelę wyników.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} data - Dane wyników.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu tabeli wyników.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! List scores for the user
const listScores = async () => {
  await fetch("/api/scores/list")
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.json().then(async (data) => {
        //* Create table
        await createScoresTable(data, ".scores-table-body");
      });
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
  return Promise.resolve();
};
