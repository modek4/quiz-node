import { messages, showMessage } from "./messages.js";
import { getSVG } from "./svg.js";
import { listCodes } from "./code.js";
import { createElement } from "./element.js";
import { createTable } from "./table.js";
import { createModal, closeModal } from "./modal.js";

/**
 * Dodaje nową akademię do bazy danych.
 *
 * @async
 * @function addAcademy
 * @see {@link listAcademies} - Funkcja listująca akademie.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {HTMLElement} button - Przycisk dodawania akademii.
 * @property {HTMLElement} newButton - Kopia przycisku dodawania akademii.
 * @property {HTMLElement[]} elements - Elementy formularza.
 * @property {string} academy - Nazwa akademii.
 * @property {string} academyCode - Kod akademii.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu akademii.
 * @property {error} buttonError - Komunikat o błędzie, jeśli przycisk dodawania akademii nie zostanie znaleziony.
 * @property {error} academyError - Komunikat o błędzie, jeśli nazwa akademii jest pusta.
 * @property {error} codeError - Komunikat o błędzie, jeśli kod akademii jest pusty.
 * @property {error} specialError - Komunikat o błędzie, jeśli nazwa lub kod akademii zawiera znaki specjalne.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Add academy
export const addAcademy = async () => {
  //* Check if button exists
  const button = document.querySelector(".admin-list-items-academy-table-button-add");
  const buttonError = messages.errors.academy_add_button_not_found;
  if (!button) return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to button
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);
  newButton.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Get values
    const elements = [
      document.getElementById("admin-list-items-academy-table-name"),
      document.getElementById("admin-list-items-academy-table-code"),
    ];
    const academy = elements[0].value;
    const academyCode = elements[1].value;
    //* Check if values exist
    const academyError = messages.errors.empty_name;
    if (!academy) return showMessage(academyError.message, academyError.description);
    const codeError = messages.errors.empty_code;
    if (!academyCode) return showMessage(codeError.message, codeError.description);
    const specialError = messages.errors.academy_special_characters;
    //* Check if values contain special characters
    if (!/^[a-zA-Z0-9 ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/.test(academy))
      return showMessage(specialError.message, specialError.description);
    if (!/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/.test(academyCode))
      return showMessage(specialError.message, specialError.description);
    //* Add academy to database
    await fetch("/api/academy/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: academy,
        code: academyCode,
      }),
    })
      //* Check response
      .then(async (response) => {
        if (response.status === 201) {
          return response.json().then(async (data) => {
            //* Reset values
            elements.forEach((element) => (element.value = ""));
            //* Reload list
            await listAcademies(["table", "select", "quiz"]);
            showMessage(data.message, "", "success");
          });
        } else {
          return response.json().then((error) => {
            showMessage(error.message, error.description);
          });
        }
      })
      .catch((error) => {
        showMessage(error.message, error.description);
      });
    return;
  });
  return;
};

/**
 * Usuwa akademię z bazy danych.
 *
 * @async
 * @function deleteAcademy
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link listAcademies} - Funkcja listująca akademie.
 * @see {@link listCodes} - Funkcja listująca kody aktywacyjne.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {HTMLElement[]} buttons - Lista przycisków usuwania akademii.
 * @property {HTMLElement} button - Przycisk usuwania akademii.
 * @property {HTMLElement} newButton - Kopia przycisku usuwania akademii.
 * @property {string} id - ID akademii.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po usunięciu akademii.
 * @property {error} buttonError - Komunikat o błędzie, jeśli przycisk usuwania akademii nie zostanie znaleziony.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Delete academy
const deleteAcademy = async () => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(".admin-list-items-academy-table [data-button=delete]");
  const buttonError = messages.errors.academy_delete_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Delete academy
    const deleteAcademy = async (e) => {
      //* Get value
      const id = button.dataset.id;
      //* Open modal
      const modal = await createModal({
        type: "delete",
        table: "academy",
        id: id,
        texts: {
          delete_text: messages.texts.academies_delete_text,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await fetch(`/api/academy/delete/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
          //* Check response
          .then(async (response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
                await listAcademies(["table", "select", "quiz"]);
                await listCodes(["table"]);
                closeModal(modal);
                showMessage(data.message, "", "success");
              });
            } else {
              //* Show error message
              return response.json().then((error) => {
                closeModal(modal);
                showMessage(error.message, error.description);
              });
            }
          })
          //* Catch error
          .catch((error) => {
            closeModal(modal);
            showMessage(error.message, error.description);
          });
        return;
      });
    };
    //* Add event listener to button
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", deleteAcademy);
  });
  return;
};

/**
 * Pobiera wartość danej akademii z bazy danych.
 *
 * @async
 * @function getAcademyValue
 * @param {string} id - ID akademii.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Academy} data - Dane z odpowiedzi.
 * @returns {Object} Obiekt z danymi akademii.
 * @throws {error} Komunikat o błędzie, jeśli nie uda się pobrać wartości akademii.
 */
//! Get academy value from database
const getAcademyValue = async (id) => {
  let data;
  await fetch(`/api/academy/list/${id}`)
    .then(async (response) => {
      if (response.status === 200) {
        return response.json().then((value) => {
          data = value;
        });
      } else {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
  return data;
};

/**
 * Edytuje akademię w bazie danych.
 *
 * @async
 * @function editAcademy
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link listAcademies} - Funkcja listująca akademie.
 * @see {@link getAcademyValue} - Funkcja pobierająca wartość akademii.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {HTMLElement[]} buttons - Lista przycisków edycji akademii.
 * @property {HTMLElement} button - Przycisk edycji akademii.
 * @property {HTMLElement} newButton - Kopia przycisku edycji akademii.
 * @property {string} id - ID akademii.
 * @property {Academy} academyData - Dane akademii.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {Object} newData - Nowe dane akademii.
 * @property {string} newData.id - ID akademii.
 * @property {string} newData.field - Pole akademii.
 * @property {string} newData.value - Nowa wartość pola akademii.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po edycji akademii.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przyciski edycji akademii nie zostaną znalezione.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @property {error} newDataError - Komunikat o błędzie, jeśli dane akademii nie zostaną znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Edit academy
const editAcademy = async () => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(".admin-list-items-academy-table [data-button=edit]");
  const buttonsError = messages.errors.academy_modify_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Edit academy
    const editAcademy = async (e) => {
      e.preventDefault();
      //* Get values
      const id = button.dataset.id;
      const academyData = await getAcademyValue(id);
      //* Open modal
      const modal = await createModal({
        type: "edit",
        table: "academy",
        id: id,
        data: {
          type: button.dataset.type,
          data: academyData[button.dataset.field],
          field: button.dataset.field,
        },
        texts: {
          delete_text: messages.texts.academies_delete_text,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newData = {
          id: id,
          field: button.dataset.field,
          value: form[button.dataset.field].value,
        };
        const newDataError = messages.errors.academy_modify_data_not_found;
        if (!newData.id || !newData.field || !newData.value || newData.value === "")
          return showMessage(newDataError.message, newDataError.description);
        await fetch("/api/academy/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newData),
        })
          //* Check response
          .then(async (response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
                await listAcademies(["table", "select", "quiz"]);
                await listCodes(["table"]);
                closeModal(modal);
                showMessage(data.message, "", "success");
              });
            } else {
              //* Show error message
              return response.json().then((error) => {
                closeModal(modal);
                showMessage(error.message, error.description);
              });
            }
          })
          //* Catch error
          .catch((error) => {
            closeModal(modal);
            showMessage(error.message, error.description);
          });
        return;
      });
    };
    //* Add event listener to button
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", editAcademy);
  });
  return;
};

/**
 * Tworzy tabelę z danymi akademii.
 *
 * @async
 * @function createAcademyTable
 * @see {@link getSVG} - Funkcja zwracająca kod SVG.
 * @see {@link createTable} - Funkcja tworząca tabelę.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @param {Academy[]} data - Lista akademii.
 * @param {string} tbody - Element, w którym mają być wyświetlone akademie.
 * @property {HTMLElement} target - Element, w którym mają być wyświetlone akademie.
 * @property {string} editSVG - Kod SVG przycisku edycji.
 * @property {string} deleteSVG - Kod SVG przycisku usuwania.
 * @property {Function} createRow - Obiekt z danymi wiersza tabeli.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu tabeli z akademiami.
 * @property {error} targetError - Komunikat o błędzie, jeśli element nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, jeśli element nie zostanie znaleziony.
 */
//! Create table with academies
const createAcademyTable = async (data, tbody) => {
  if (!data) return Promise.resolve();
  //* Check if target exists
  const target = document.querySelector(tbody);
  const targetError = messages.errors.academy_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get SVGs
  const editSVG = getSVG("edit");
  const deleteSVG = getSVG("delete");
  //* List of all elements
  const createRow = (item) => ({
    tag: "tr",
    attributes: { role: "row" },
    children: [
      //* Users in academy
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-academy-users-table",
        },
        dataset: {
          label: `${messages.texts.academies_table_users}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.user_count.toString() || 0,
                attributes: {
                  "aria-label": item.user_count.toString() || 0,
                },
              },
            ],
          },
        ],
      },
      //* Academy name
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-academy-table",
        },
        dataset: {
          label: `${messages.texts.academies_table_academy}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.name,
                attributes: {
                  "aria-label": item.name,
                },
              },
              {
                tag: "button",
                content: editSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  field: "name",
                  type: "text",
                  button: "edit",
                },
                attributes: {
                  "aria-label": "Edit",
                  role: "button",
                },
              },
            ],
          },
        ],
      },
      //* Academy code
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-academy-code-table",
        },
        dataset: {
          label: `${messages.texts.academies_table_academy_code}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.code,
                attributes: {
                  "aria-label": item.code,
                },
              },
              {
                tag: "button",
                content: editSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  field: "code",
                  type: "text",
                  button: "edit",
                },
                attributes: {
                  "aria-label": "Edit",
                  role: "button",
                },
              },
            ],
          },
        ],
      },
      //* Delete button
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-academy-actions-table",
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "button",
                content: deleteSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  button: "delete",
                },
                attributes: {
                  "aria-label": messages.texts.actions_delete,
                  role: "button",
                },
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
    firstRow: true,
    colNumbers: 4,
    createRow: createRow,
  });
  return Promise.resolve();
};

/**
 * Dodaje dane akademii do obiektu select.
 *
 * @async
 * @function createAcademySelect
 * @see {@link createElement} - Funkcja tworząca element HTML.
 * @param {Academy[]} data - Lista akademii.
 * @param {HTMLElement} target - Element, w którym mają być wyświetlone akademie.
 * @property {HTMLElement} firstOption - Pierwsza, domyślna opcja selecta.
 * @property {HTMLElement} option - Opcja selecta z danymi akademii.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu danych do obiektu select.
 */
//! Load data into select (academies)
const createAcademySelect = async (data, target) => {
  if (!target || !data) return Promise.resolve();
  //* If we have more than one academy, add a default option
  if (data.length !== 1) {
    const firstOption = target.querySelector("option:first-child");
    target.innerHTML = "";
    target.appendChild(firstOption);
  } else {
    target.innerHTML = "";
  }
  //* Create options for select
  data.forEach((item) => {
    const option = createElement({
      tag: "option",
      attributes: { value: item._id },
      content: item.name,
    });
    target.appendChild(option);
  });
  return Promise.resolve();
};

/**
 * Pobiera i wyświetla listę akademii.
 *
 * @async
 * @function listAcademies
 * @see {@link addAcademy} - Funkcja dodająca akademię.
 * @see {@link deleteAcademy} - Funkcja usuwająca akademię.
 * @see {@link editAcademy} - Funkcja edytująca akademię.
 * @see {@link createAcademySelect} - Funkcja dodająca dane do obiektu select.
 * @see {@link createAcademyTable} - Funkcja tworząca tabelę z akademiami.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @param {string[]} load - Tablica określająca, gdzie załadować dane akademii (tabela, select, quiz).
 * @property {Response} response - Odpowiedź z serwera z listą akademii.
 * @property {Academy[]} data - Lista akademii.
 * @property {HTMLElement} target - Element, w którym mają być wyświetlone akademie.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pobraniu i wyświetleniu listy akademii.
 * @property {error} targetError - Komunikat o błędzie, jeśli element nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, jeśli element nie zostanie znaleziony.
 */
//! List academies from database
export const listAcademies = async (load) => {
  //* Load academies
  await fetch("/api/academy/list")
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.json().then(async (data) => {
        //* Check if data exists
        const loadError = messages.errors.academy_not_found;
        if (!load) return showMessage(loadError.message, loadError.description);
        //* Load data into table
        if (load.includes("table"))
          await createAcademyTable(data, ".admin-list-items-academy-table tbody");
        //* Load data into select (activation codes)
        if (load.includes("select")) {
          //* Check if target exists
          const target = document.getElementById("admin-list-items-code-table-academy");
          const targetError = messages.errors.academy_select_not_found;
          if (!target) return showMessage(targetError.message, targetError.description);
          await createAcademySelect(data, target);
        }
        //* Load data into select (quizzes cards)
        if (load.includes("quiz")) {
          //* Check if target exists
          const target = document.getElementById("admin-list-items-quiz-table-academy");
          const targetError = messages.errors.quiz_select_not_found;
          if (!target) return showMessage(targetError.message, targetError.description);
          await createAcademySelect(data, target);
        }
        //* Run functions to delete, edit and add academies
        addAcademy();
        if (data.length > 0) {
          deleteAcademy();
          editAcademy();
        }
        return Promise.resolve();
      });
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};
