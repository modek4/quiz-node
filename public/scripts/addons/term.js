import { messages, showMessage } from "./messages.js";
import { createModal, closeModal } from "./modal.js";
import { listUsers } from "./user.js";

/**
 * Edytuje semestr użytkownika w tabeli użytkowników w panelu administratora.
 *
 * @async
 * @function editTerm
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link createModal} - Funkcja tworząca modal.
 * @see {@link closeModal} - Funka zamykająca modal.
 * @see {@link listUsers} - Funkcja listująca użytkowników.
 * @param {string} tbody - Selektor elementu tbody tabeli, w której znajdują się przyciski edycji.
 * @property {HTMLElement} body - Element tbody tabeli do wypełnienia danymi semestrów.
 * @property {NodeList} buttons - Lista przycisków edycji w tabeli semestrów.
 * @property {HTMLElement} button - Przycisk edycji semestru.
 * @property {HTMLElement} newButton - Sklonowany przycisk edycji semestru.
 * @property {string} id - ID semestru do edycji.
 * @property {Object} data - Obiekt z danymi semestrów do edycji.
 * @property {HTMLElement} modal - Element modala do edycji semestru.
 * @property {HTMLFormElement} form - Formularz w modal do edycji semestru.
 * @property {Object} dataTerm - Obiekt z danymi semestru do wysłania na serwer.
 * @property {string} dataTerm.id - ID semestru do edycji.
 * @property {string} dataTerm.field - Pole semestru do edycji.
 * @property {string} dataTerm.value - Nowa wartość semestru.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Obiekt z danymi odpowiedzi w formacie obiektu wiaodmości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy semestr użytkownika zostanie edytowany.
 * @property {error} bodyError - Komunikat o błędzie, gdy nie zostanie znaleziony element tbody tabeli.
 * @property {error} buttonsError - Komunikat o błędzie, gdy nie zostaną znalezione przyciski edycji.
 * @property {error} modalError - Komunikat o błędzie, gdy nie zostanie znaleziony modal.
 * @property {error} dataError - Komunikat o błędzie, gdy nie zostaną znalezione dane semestru.
 * @property {error} termsError - Komunikat o błędzie, gdy wartość semestru jest nieprawidłowa.
 * @throws {Error} Wyświetla komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Edit term
export const editTerm = async (tbody) => {
  //* Check if table body exists
  const body = document.querySelector(tbody);
  const bodyError = messages.errors.term_modify_data_not_found;
  if (!body) return showMessage(bodyError.message, bodyError.description);
  //* Check if buttons exist
  const buttons = body.querySelectorAll("[data-button=edit]");
  const buttonsError = messages.errors.term_modify_button_not_found;
  if (!buttons) return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Edit term
    const editTerm = async () => {
      //* Get values
      const id = button.dataset.id;
      const getValue = async (id) => {
        let data;
        await fetch(`/api/term/list/${id}`)
          .then(async (response) => {
            //* Check response
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
      const data = await getValue(id);
      //* Open modal
      const modal = await createModal({
        type: "edit",
        table: "code",
        id: id,
        data: {
          type: button.dataset.type,
          data: data[button.dataset.field],
          field: button.dataset.field,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dataTerm = {
          id: id,
          field: button.dataset.field,
          value: form[button.dataset.field].value.trim(),
        };
        //* Check if the value is valid
        const dataError = messages.errors.term_modify_data_not_found;
        if (!dataTerm.id || !dataTerm.field || !dataTerm.value || dataTerm.value === "")
          return showMessage(dataError.message, dataError.description);
        const termsError = messages.errors.array_terms;
        if (!dataTerm.value.match(/^\d+(,\d+)*$/))
          return showMessage(termsError.message, termsError.description);
        //* Send data to the server
        fetch("/api/term/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataTerm),
        })
          //* Check response
          .then(async (response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
                await listUsers();
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
    newButton.addEventListener("click", editTerm);
  });
  return;
};
