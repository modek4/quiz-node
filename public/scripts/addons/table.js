import { createElement } from "./element.js";
import { messages } from "./messages.js";

/**
 * Tworzy tabelę na podstawie danych.
 *
 * @function createTable
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {Object[]} data - Tablica danych do wyświetlenia w tabeli.
 * @param {HTMLElement} target - Element docelowy tabeli.
 * @param {boolean} [firstRow=false] - Czy dodać pierwszy wiersz.
 * @param {number} colNumbers - Liczba kolumn w tabeli.
 * @param {Function} createRow - Funkcja tworząca wiersz tabeli.
 * @property {HTMLElement} firstRowElement - Pierwszy wiersz tabeli.
 * @property {HTMLElement} row - Wiersz tabeli.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu tabeli.
 * @property {error} noDataError - Komunikat o braku danych.
 * @throws {error} Komunikat o błędzie, jeśli nie uda się utworzyć tabeli.
 */
//! Create a table
export const createTable = ({
  data, //? Data array
  target, //? Target element
  firstRow = false, //? First row boolean
  colNumbers, //? Number of columns
  createRow: createRow, //? Function to create a row
}) => {
  //* Get first row
  const firstRowElement = target.querySelector("tr:first-child");
  //* Clear target
  target.innerHTML = "";
  //* Append first row if true
  if (firstRow && firstRowElement) target.appendChild(firstRowElement);
  //* Check if data exists
  if (data.length === 0 || !data) {
    const noDataError = messages.errors.no_data.message;
    target.appendChild(
      createElement({
        tag: "tr",
        children: [
          {
            tag: "td",
            content: noDataError,
            attributes: {
              colSpan: colNumbers,
              "aria-label": noDataError,
            },
            classes: ["no-data"],
          },
        ],
      })
    );
    return;
  }
  //* Create rows for each academy
  data.forEach((item) => {
    const row = createElement(createRow(item));
    target.appendChild(row);
  });
  return Promise.resolve();
};
