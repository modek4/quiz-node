import { messages, showMessage } from "./messages.js";
import { getSVG } from "./svg.js";
import { createTable } from "./table.js";
import { createModal, closeModal } from "./modal.js";

/**
 * Dodaje kod aktywacyjny do bazy danych.
 *
 * @async
 * @function addCode
 * @see {@link listCodes} - Funkcja listująca kody aktywacyjne.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {HTMLElement} button - Przycisk dodawania kodu aktywacyjnego.
 * @property {HTMLElement} newButton - Kopia przycisku dodawania kodu aktywacyjnego.
 * @property {HTMLElement[]} elements - Lista elementów formularza.
 * @property {string} amount - Ilość kodów aktywacyjnych.
 * @property {string} terms - Terminy przypisane do kodu.
 * @property {string} role - Rola przypisana do kodu.
 * @property {string} academy_id - ID akademii przypisanej do kodu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu kodu aktywacyjnego.
 * @property {error} buttonError - Komunikat o błędzie, jeśli przycisk dodawania kodu aktywacyjnego nie zostanie znaleziony.
 * @property {error} valuesError - Komunikat o błędzie, jeśli wartości formularza są nieprawidłowe.
 * @property {error} amountError - Komunikat o błędzie, jeśli ilość kodów jest nieprawidłowa.
 * @property {error} termsError - Komunikat o błędzie, jeśli terminy są nieprawidłowe.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Add code
const addCode = async () => {
  //* Check if button exists
  const button = document.querySelector(".admin-list-items-activation-code-table-button-add");
  const buttonError = messages.errors.activation_code_add_button_not_found;
  if (!button) return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to button
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);
  newButton.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Get values
    const elements = [
      document.getElementById("admin-list-items-code-table-amount"),
      document.getElementById("admin-list-items-code-table-terms"),
      document.getElementById("admin-list-items-code-table-role"),
      document.getElementById("admin-list-items-code-table-academy"),
    ];
    const amount = elements[0].value;
    const terms = elements[1].value;
    const role = elements[2].value;
    const academy_id = elements[3].value;
    //* Check if values exist
    const valuesError = messages.errors.activation_code_values_required;
    if (!amount || !terms || role == 0 || academy_id == 0)
      return showMessage(valuesError.message, valuesError.description);
    const amountError = messages.errors.integer_amount;
    if (!amount.match(/^\d+$/)) return showMessage(amountError.message, amountError.description);
    const termsError = messages.errors.array_terms;
    if (!terms.match(/^\d+(,\d+)*$/))
      return showMessage(termsError.message, termsError.description);
    //* Add academy to database
    await fetch("/api/code/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseInt(amount),
        term: terms,
        role: role,
        academy_id: academy_id,
      }),
    })
      //* Check response
      .then(async (response) => {
        if (response.status === 201) {
          return response.json().then(async (data) => {
            //* Reset values
            elements.forEach((element) => (element.value = ""));
            [elements[3], elements[2]].forEach((element) => (element.options.selectedIndex = 0));
            //* Reload list
            await listCodes(["table"]);
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
  });
  return Promise.resolve();
};

/**
 * Usuwa kod aktywacyjny z bazy danych.
 *
 * @async
 * @function deleteCode
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link listCodes} - Funkcja listująca kody aktywacyjne.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {HTMLElement[]} buttons - Lista przycisków usuwania kodu aktywacyjnego.
 * @property {HTMLElement} button - Przycisk usuwania kodu aktywacyjnego.
 * @property {HTMLElement} newButton - Kopia przycisku usuwania kodu aktywacyjnego.
 * @property {string} id - ID kodu aktywacyjnego.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po usunięciu kodu aktywacyjnego.
 * @property {error} buttonError - Komunikat o błędzie, jeśli przycisk usuwania kodu aktywacyjnego nie zostanie znaleziony.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Delete code
const deleteCode = async () => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(".admin-list-items-code-table [data-button=delete]");
  const buttonError = messages.errors.activation_code_delete_button_not_found;
  if (!buttons) return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Delete code
    const deleteCode = async (e) => {
      //* Get value
      const id = button.dataset.id;
      //* Open modal
      const modal = await createModal({
        type: "delete",
        table: "code",
        id: id,
        texts: {
          delete_text: messages.texts.activation_codes_delete_text,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await fetch(`/api/code/delete/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        })
          //* Check response
          .then(async (response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
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
    newButton.addEventListener("click", deleteCode);
  });
  return Promise.resolve();
};

/**
 * Kopiuje kod aktywacyjny do schowka.
 *
 * @async
 * @function copyCode
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {string} element - Selektor przycisku kopiowania kodu aktywacyjnego.
 * @property {HTMLElement[]} buttons - Lista przycisków kopiowania kodu aktywacyjnego.
 * @property {HTMLElement} button - Przycisk kopiowania kodu aktywacyjnego.
 * @property {string} code - Kod aktywacyjny do skopiowania.
 * @property {string} copied - Komunikat o skopiowaniu kodu aktywacyjnego.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po skopiowaniu kodu aktywacyjnego.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przyciski kopiowania kodu aktywacyjnego nie zostaną znalezione.
 * @property {error} copyError - Komunikat o błędzie, jeśli kopiowanie kodu aktywacyjnego się nie powiedzie.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Copy code
export const copyCode = async (element) => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(element);
  const buttonsError = messages.errors.activation_code_copy_button_not_found;
  if (!buttons.length) return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to buttons
  buttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get value
      const code = button.dataset.value;
      const copyError = messages.errors.activation_code_copy_failed;
      //* Copy to clipboard
      if (!navigator.clipboard) return showMessage(copyError.message, copyError.description);
      navigator.clipboard.writeText(code).then(() => {
        const copied = messages.success.activation_code_copied;
        showMessage(`${copied}: ${code}`, "", "success");
      });
    });
  });
  return Promise.resolve();
};

/**
 * Tworzy tabelę kodów aktywacyjnych.
 *
 * @async
 * @function createCodeTable
 * @see {@link createTable} - Funkcja tworząca tabelę.
 * @see {@link getSVG} - Funkcja pobierająca ikonę SVG.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {Code[]} data - Lista kodów aktywacyjnych.
 * @param {string} tbody - Selektor elementu docelowego tabeli.
 * @property {HTMLElement} target - Element docelowy tabeli.
 * @property {HTMLElement} deleteSVG - Ikona usuwania.
 * @property {HTMLElement} copySVG - Ikona kopiowania.
 * @property {Function} createRow - Obiekt z danymi wiersza tabeli.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu tabeli kodów aktywacyjnych.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy tabeli nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Create activation code table
const createCodeTable = async (data, tbody) => {
  //* Check if target exists
  const target = document.querySelector(tbody);
  const targetError = messages.errors.activation_code_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get SVGs
  const deleteSVG = getSVG("delete");
  const copySVG = getSVG("copy");
  //* List of all codes
  const createRow = (item) => ({
    tag: "tr",
    attributes: { role: "row" },
    children: [
      //* Code
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-code-table",
        },
        dataset: {
          label: `${messages.texts.activation_codes_table_code}: `,
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
                content: copySVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  value: item.code,
                  button: "copy",
                },
                attributes: {
                  "aria-label": "Copy code",
                  role: "button",
                },
              },
            ],
          },
        ],
      },
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-code-terms-table",
        },
        dataset: {
          label: `${messages.texts.activation_codes_table_terms}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.term.join(", "),
                attributes: {
                  "aria-label": item.term.join(", "),
                },
              },
            ],
          },
        ],
      },
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-code-role-table",
        },
        dataset: {
          label: `${messages.texts.activation_codes_table_role}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.role,
                attributes: {
                  "aria-label": item.role,
                },
              },
            ],
          },
        ],
      },
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-code-academy-table",
        },
        dataset: {
          label: `${messages.texts.activation_codes_table_academy}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.academy,
                attributes: {
                  "aria-label": item.academy,
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
          "aria-labelledby": "col-code-actions-table",
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
  //* Create the table
  createTable({
    data: data || [],
    target: target,
    firstRow: true,
    colNumbers: 5,
    createRow: createRow,
  });
  return Promise.resolve();
};

/**
 * Pobiera i wyświetla listę kodów aktywacyjnych.
 *
 * @async
 * @function listCodes
 * @see {@link createCodeTable} - Funkcja tworząca tabelę kodów aktywacyjnych.
 * @see {@link addCode} - Funkcja dodająca kod aktywacyjny.
 * @see {@link deleteCode} - Funkcja usuwająca kod aktywacyjny.
 * @see {@link copyCode} - Funkcja kopiująca kod aktywacyjny.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {string[]} load - Lista elementów do załadowania.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} data - Dane kodów aktywacyjnych.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pobraniu i wyświetleniu listy kodów aktywacyjnych.
 * @property {error} loadError - Komunikat o błędzie, jeśli lista elementów do załadowania jest pusta.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! List codes
export const listCodes = async (load) => {
  await fetch("/api/code/list")
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.json().then(async (data) => {
        const loadError = messages.errors.activation_code_not_found;
        if (!load) return showMessage(loadError.message, loadError.description);
        //* Check if load is provided
        if (load.includes("table"))
          await createCodeTable(data, ".admin-list-items-code-table tbody");
        //* Run functions to delete, copy and add activation codes
        addCode();
        if (data.length > 0) {
          deleteCode();
          copyCode(".admin-list-items-code-table button[data-button='copy']");
        }
        return Promise.resolve();
      });
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};
