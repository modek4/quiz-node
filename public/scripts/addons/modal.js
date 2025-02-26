import { showMessage, messages } from "./messages.js";
import { createElement } from "./element.js";

/**
 * Tworzy okno modalne na podstawie podanych opcji.
 *
 * @async
 * @function createModal
 * @see {@link deleteModal} - Funkcja tworząca okno modalne do usuwania elementów.
 * @see {@link editModal} - Funkcja tworząca okno modalne do edycji elementów.
 * @see {@link notificationModal} - Funkcja tworząca okno modalne do wysyłania powiadomień.
 * @see {@link quizModal} - Funkcja tworząca okno modalne przed rozpoczęciem quizu.
 * @see {@link imageModal} - Funkcja tworząca okno modalne do podglądu obrazka.
 * @see {@link reportModal} - Funkcja tworząca okno modalne do zgłaszania pytań.
 * @see {@link explanationModal} - Funkcja tworząca okno modalne do wyjaśnień w quizie.
 * @see {@link statisticsModal} - Funkcja tworząca okno modalne do statystyk użytkownika.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link showMessage} - Funkcja wyświetlająca wiadomość.
 * @param {string} type - Typ okna modalnego (delete, edit, notification, quiz, image, report, explanation, statistics).
 * @param {string} table - Nazwa tabeli.
 * @param {string} id - ID rekordu.
 * @param {string} field - Pole do edycji.
 * @param {Object} data - Dane do edycji.
 * @param {Object} texts - Niestandardowe wiadomości.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} close - Przycisk zamykający okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 * @property {error} typeError - Komunikat o błędzie, jeśli typ okna modalnego nie zostanie znaleziony.
 * @property {error} tableError - Komunikat o błędzie, jeśli nazwa tabeli nie zostanie znaleziona.
 * @property {error} idError - Komunikat o błędzie, jeśli ID rekordu nie zostanie znalezione.
 * @property {error} targetError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Modal window
export const createModal = async ({
  type, //? Type of modal (delete, edit)
  table, //? Table name
  id, //? ID of the record
  field, //? Field to edit
  data = {}, //? Data to edit
  texts = {}, //? Custom messages
}) => {
  //* Check if elements exist
  const typeError = messages.errors.modal_not_type_found;
  if (!type) return showMessage(typeError.message, typeError.description);
  const tableError = messages.errors.modal_not_table_found;
  if (!table) return showMessage(tableError.message, tableError.description);
  const idError = messages.errors.modal_not_id_found;
  if (!id) return showMessage(idError.message, idError.description);
  //* Create modal/dialog
  var modal = null;
  switch (type) {
    case "delete":
      modal = await deleteModal({ table, id, texts });
      break;
    case "edit":
      modal = await editModal({ table, id, data });
      break;
    case "notification":
      modal = await notificationModal({ table, id, data });
      break;
    case "quiz":
      modal = await quizModal({ table, id, data });
      break;
    case "image":
      modal = await imageModal({ data });
      break;
    case "report":
      modal = await reportModal({ id, data });
      break;
    case "explanation":
      modal = await explanationModal({ data });
      break;
    case "statistics":
      modal = await statisticsModal({ table, id, data });
      break;
    default:
      break;
  }
  //* Append modal
  document.body.appendChild(modal);
  //* Check if elements exist
  const close = modal.querySelector("[data-modal-close]");
  const form = modal.querySelector("form");
  const targetError = messages.errors.modal_not_found;
  if (!form || !close) return showMessage(targetError.message, targetError.description);
  //* Close event listener
  close.addEventListener("click", (e) => {
    e.preventDefault();
    //* Close modal
    closeModal(modal);
  });
  return Promise.resolve(modal);
};

/**
 * Zamyka okno modalne.
 *
 * @function closeModal
 * @see {@link showMessage} - Funkcja wyświetlająca wiadomość.
 * @param {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zamknięciu okna modalnego.
 * @property {error} formError - Komunikat o błędzie, jeśli formularz okna modalnego nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Close modal
export const closeModal = (modal) => {
  //* Check if elements exist
  const form = modal.querySelector("form");
  const formError = messages.errors.modal_not_found;
  if (!form || !modal) return showMessage(formError.message, formError.description);
  //* Add class with animation
  form.classList.add("hide");
  setTimeout(() => {
    //* Delete modal
    modal.remove();
  }, 200);
  return Promise.resolve();
};

/**
 * Tworzy okno modalne do usuwania elementów.
 *
 * @async
 * @function deleteModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {string} table - Nazwa tabeli.
 * @param {string} id - ID rekordu.
 * @param {Object} texts - Niestandardowe wiadomości.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Delete modal
const deleteModal = async ({ table, id, texts }) => {
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content"],
        children: [
          {
            tag: "input",
            properties: { type: "hidden", value: id, name: "id" },
          },
          {
            tag: "input",
            properties: { type: "hidden", value: table, name: "table" },
          },
          {
            tag: "p",
            content: texts.delete_text || messages.texts.modal_delete_text,
          },
          {
            tag: "input",
            properties: {
              type: "submit",
              value: messages.texts.modal_delete,
            },
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_cancel,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Tworzy okno modalne do edycji elementów.
 *
 * @async
 * @function editModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {string} table - Nazwa tabeli.
 * @param {string} id - ID rekordu.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Edit modal
const editModal = async ({ table, id, data }) => {
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content"],
        id: "edit-form",
        children: [
          {
            tag: "input",
            properties: { type: "hidden", value: id, name: "id" },
          },
          {
            tag: "input",
            properties: { type: "hidden", value: table, name: "table" },
          },
          {
            tag: "input",
            properties: {
              type: data.type,
              value: data.data,
              name: data.field,
              autocomplete: "off",
            },
          },
          {
            tag: "input",
            properties: { type: "submit", value: messages.texts.modal_edit },
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_cancel,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Tworzy okno modalne do wysyłania powiadomień.
 *
 * @async
 * @function notificationModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {string} table - Nazwa tabeli.
 * @param {string} id - ID rekordu.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Notification modal
const notificationModal = async ({ table, id, data }) => {
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content"],
        id: "edit-form",
        children: [
          {
            tag: "input",
            properties: { type: "hidden", value: id, name: "id" },
          },
          {
            tag: "input",
            properties: { type: "hidden", value: table, name: "table" },
          },
          {
            tag: "input",
            properties: {
              type: "text",
              name: "email",
              value: data.email,
              autocomplete: "off",
            },
            attributes: { disabled: "", style: "margin-bottom: .25em" },
          },
          {
            tag: "input",
            properties: {
              type: "text",
              name: "content",
              placeholder: messages.texts.modal_notification_placeholder,
            },
          },
          {
            tag: "input",
            properties: { type: "submit", value: messages.texts.modal_send },
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_cancel,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Pobiera lokalne ustawienia dla okna modalnego quizu.
 *
 * @function getLocalStorage
 * @param {string} key - Klucz ustawienia.
 * @returns {boolean} Wartość ustawienia z localStorage.
 */
//! Get local storage for quiz modal
const getLocalStorage = (key) => {
  let storedValue = localStorage.getItem(key);
  if (storedValue === null) {
    localStorage.setItem(key, JSON.stringify(false));
    return false;
  }
  return JSON.parse(storedValue);
};

/**
 * Tworzy okno modalne przed rozpoczęciem quizu.
 *
 * @async
 * @function quizModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @see {@link getLocalStorage} - Funkcja pobierająca wartość z localStorage.
 * @param {string} table - Nazwa tabeli.
 * @param {string} id - ID rekordu.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Quiz modal
const quizModal = async ({ table, id, data }) => {
  //* Create modal
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content"],
        id: "start-quiz",
        children: [
          {
            tag: "input",
            properties: { type: "hidden", value: id, name: "id" },
          },
          {
            tag: "input",
            properties: { type: "hidden", value: table, name: "table" },
          },
          {
            tag: "h2",
            content: data.title,
          },
          {
            tag: "p",
            content: messages.texts.quiz_question_count,
            attributes: { "aria-label": "question_count_range-label" },
            children: [
              {
                tag: "input",
                properties: {
                  type: "number",
                  name: "quiz_question_count",
                  min: 1,
                  max: data.question_count,
                  value: data.question_count,
                },
                attributes: { "aria-label": "question_count_range" },
              },
            ],
          },
          {
            tag: "ul",
            attributes: { "aria-label": "quiz_category-label" },
            children: [
              {
                tag: "li",
                properties: { role: "listitem" },
                classes: ["quiz_listitem"],
                children: [
                  {
                    tag: "label",
                    classes: ["switch"],
                    children: [
                      {
                        tag: "input",
                        properties: {
                          type: "checkbox",
                          name: "quiz_checkbox_random",
                          checked: getLocalStorage("random") == true ? true : false,
                        },
                        classes: ["checkbox"],
                        dataset: { id: "random" },
                        id: "switch-random",
                      },
                      {
                        tag: "div",
                        classes: ["slider"],
                      },
                      {
                        tag: "span",
                        content: messages.texts.account_random,
                      },
                    ],
                  },
                ],
              },
              {
                tag: "li",
                properties: { role: "listitem" },
                classes: ["quiz_listitem"],
                children: [
                  {
                    tag: "label",
                    classes: ["switch"],
                    children: [
                      {
                        tag: "input",
                        properties: {
                          type: "checkbox",
                          name: "quiz_checkbox_autosave",
                          checked: getLocalStorage("autosave") == true ? true : false,
                        },
                        classes: ["checkbox"],
                        dataset: { id: "autosave" },
                        id: "switch-autosave",
                      },
                      {
                        tag: "div",
                        classes: ["slider"],
                      },
                      {
                        tag: "span",
                        content: messages.texts.account_autosave,
                      },
                    ],
                  },
                ],
              },
              {
                tag: "li",
                properties: { role: "listitem" },
                classes: ["quiz_listitem"],
                children: [
                  {
                    tag: "label",
                    classes: ["switch"],
                    children: [
                      {
                        tag: "input",
                        properties: {
                          type: "checkbox",
                          name: "quiz_checkbox_explanation",
                          checked: getLocalStorage("explanation") == true ? true : false,
                        },
                        classes: ["checkbox"],
                        dataset: { id: "explanation" },
                        id: "switch-explanation",
                      },
                      {
                        tag: "div",
                        classes: ["slider"],
                      },
                      {
                        tag: "span",
                        content: messages.texts.account_explanation,
                      },
                    ],
                  },
                ],
              },
              {
                tag: "li",
                properties: { role: "listitem" },
                classes: ["quiz_listitem"],
                children: [
                  {
                    tag: "label",
                    classes: ["switch"],
                    children: [
                      {
                        tag: "input",
                        properties: {
                          type: "checkbox",
                          name: "quiz_checkbox_open_question",
                          checked: getLocalStorage("open_question") == true ? true : false,
                        },
                        classes: ["checkbox"],
                        dataset: { id: "open_question" },
                        id: "switch-open_question",
                      },
                      {
                        tag: "div",
                        classes: ["slider"],
                      },
                      {
                        tag: "span",
                        content: messages.texts.account_open,
                      },
                    ],
                  },
                ],
              },
              {
                tag: "li",
                properties: { role: "listitem" },
                classes: ["quiz_listitem"],
                children: [
                  {
                    tag: "label",
                    classes: ["switch"],
                    children: [
                      {
                        tag: "input",
                        properties: {
                          type: "checkbox",
                          name: "quiz_checkbox_livecheck",
                          checked: getLocalStorage("livecheck") == true ? true : false,
                        },
                        classes: ["checkbox"],
                        dataset: { id: "livecheck" },
                        id: "switch-livecheck",
                      },
                      {
                        tag: "div",
                        classes: ["slider"],
                      },
                      {
                        tag: "span",
                        content: messages.texts.account_livecheck,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "input",
            properties: { type: "submit", value: messages.texts.quiz_start_text },
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_cancel,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Tworzy okno modalne do podglądu obrazka.
 *
 * @async
 * @function imageModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Image modal
const imageModal = async ({ data }) => {
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-image"],
        children: [
          {
            tag: "img",
            properties: { src: data.src, alt: data.alt },
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_close,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Tworzy okno modalne do zgłaszania pytań.
 *
 * @async
 * @function reportModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {string} id - ID rekordu.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Report modal
const reportModal = async ({ id, data }) => {
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content"],
        children: [
          {
            tag: "input",
            properties: { type: "hidden", value: id, name: "id" },
          },
          {
            tag: "p",
            content: `${messages.texts.modal_report_text}`,
          },
          {
            tag: "input",
            properties: {
              type: "text",
              name: "question",
              value: data.question,
            },
            attributes: {
              disabled: "",
            },
          },
          {
            tag: "input",
            properties: {
              type: "submit",
              value: messages.texts.modal_report,
            },
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_cancel,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Tworzy okno modalne do wyjaśnień w quizie.
 *
 * @async
 * @function explanationModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Explanation modal
const explanationModal = async ({ data }) => {
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content", "justify"],
        children: [
          {
            tag: "p",
            content: data.explanation,
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_close,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};

/**
 * Tworzy okno modalne do statystyk użytkownika.
 *
 * @async
 * @function statisticsModal
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {string} table - Nazwa tabeli.
 * @param {string} id - ID rekordu.
 * @param {Object} data - Dane do edycji.
 * @property {HTMLElement} modal - Utworzone okno modalne.
 * @property {HTMLElement} tableElemets - Elementy tabeli.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się po utworzeniu okna modalnego.
 */
//! Statistics modal
const statisticsModal = async ({ table, id, data }) => {
  let tableElemets = typeof data.scores === "object" ? data.scores : JSON.parse(data.scores);
  //* Create table elements
  tableElemets = tableElemets.map((item) => {
    return {
      tag: "tr",
      children: [
        {
          tag: "td",
          attributes: { role: "cell" },
          content: item.quiz_name == null ? messages.texts.scores_table_name_null : item.quiz_name,
        },
        {
          tag: "td",
          attributes: { role: "cell" },
          content: `${item.average_percentage.toFixed(2)}%`,
        },
      ],
    };
  });
  //* Create modal
  const modal = createElement({
    tag: "dialog",
    attributes: { open: "" },
    dataset: { modal: "" },
    children: [
      {
        tag: "form",
        classes: ["modal-content", "modal-statistics"],
        id: "edit-form",
        children: [
          {
            tag: "input",
            properties: { type: "hidden", value: id, name: "id" },
          },
          {
            tag: "input",
            properties: { type: "hidden", value: table, name: "table" },
          },
          {
            tag: "input",
            properties: {
              type: "text",
              name: "email",
              value: data.email,
              autocomplete: "off",
            },
            attributes: { disabled: "", style: "margin-bottom: .25em" },
          },
          {
            tag: "table",
            attributes: { role: "table" },
            classes: ["modal-statistics"],
            children: [
              {
                tag: "tr",
                children: [
                  {
                    tag: "th",
                    attributes: { role: "columnheader" },
                    content: messages.texts.modal_statistics_title,
                  },
                  {
                    tag: "th",
                    attributes: { role: "columnheader" },
                    content: messages.texts.modal_statistics_percentage,
                  },
                ],
              },
              ...tableElemets,
            ],
          },
          {
            tag: "button",
            attributes: { "data-modal-close": "" },
            content: messages.texts.modal_cancel,
          },
        ],
      },
    ],
  });
  return Promise.resolve(modal);
};
