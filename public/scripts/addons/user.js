import { messages, showMessage } from "./messages.js";
import { getSVG } from "./svg.js";
import { copyCode } from "./code.js";
import { createTable } from "./table.js";
import { createModal } from "./modal.js";
import { editTerm } from "./term.js";
import { sendNotification } from "./notification.js";

/**
 * Zmienia rolę użytkownika w panelu administracyjnym.
 *
 * @async
 * @function changeRole
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {HTMLElement} target - Element tbody tabeli do wypełnienia danymi użytkowników.
 * @property {NodeList} selects - Lista elementów select w tabeli użytkowników.
 * @property {HTMLElement} select - Element select z rolą użytkownika.
 * @property {string} selected - Wybrana rola użytkownika.
 * @property {string} id - ID użytkownika.
 * @property {string} role - Nowa rola użytkownika.
 * @property {Function} resetSelect - Funkcja resetująca wybraną rolę użytkownika.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Obiekt z danymi odpowiedzi w formacie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy rola użytkownika zostanie zmieniona.
 * @property {error} targetError - Komunikat o błędzie, gdy nie zostanie znaleziony element tbody tabeli.
 * @property {error} selectsError - Komunikat o błędzie, gdy nie zostaną znalezione elementy select.
 * @throws {error} Wyświetla komunikat o błędzie, jeśli tabela użytkowników lub elementy select nie zostaną znalezione.
 */
//! Change user role
const changeRole = async () => {
  //* Check if target exists
  const target = document.querySelector(".admin-list-items-users-table tbody");
  const targetError = messages.errors.users_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get all select elements
  const selects = target.querySelectorAll("select[name=role]");
  const selectsError = messages.errors.users_table_role_not_found;
  if (!selects || selects.length <= 0)
    return showMessage(selectsError.message, selectsError.description);
  selects.forEach((select) => {
    //* Get selected value
    const selected = select.options[select.selectedIndex].value;
    //* Add event listener to each select
    select.addEventListener("change", async (e) => {
      e.preventDefault();
      //* Get data
      const id = select.dataset.id;
      const role = select.value;
      const resetSelect = () => {
        select.value = selected;
      };
      //* Try to change the role
      await fetch(`/api/user/role/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_role: role, old_role: selected }),
      })
        .then(async (response) => {
          if (response.status === 200) {
            return response.json().then(async (data) => {
              showMessage(data.message, "", "success");
            });
          } else {
            return response.json().then((error) => {
              resetSelect();
              showMessage(error.message, error.description);
            });
          }
        })
        .catch((error) => {
          resetSelect();
          showMessage(error.message, error.description);
        });
    });
  });
};

/**
 * Wyświetla statystyki użytkownika w panelu administracyjnym.
 *
 * @async
 * @function userStatistics
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {HTMLElement} target - Element tbody tabeli do wypełnienia danymi użytkowników.
 * @property {NodeList} buttons - Lista przycisków statystyk użytkownika.
 * @property {HTMLElement} button - Przycisk statystyk użytkownika.
 * @property {string} id - ID użytkownika.
 * @property {string} email - Email użytkownika.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Obiekt z danymi odpowiedzi w formacie obiektu z wynikami użytkownika.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy statystyki użytkownika zostaną wyświetlone.
 * @property {error} targetError - Komunikat o błędzie, gdy nie zostanie znaleziony element tbody tabeli.
 * @property {error} buttonsError - Komunikat o błędzie, gdy nie zostaną znalezione przyciski statystyk.
 * @throws {Error} Wyświetla komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! User statistics
const userStatistics = async () => {
  //* Check if target exists
  const target = document.querySelector(".admin-list-items-users-table tbody");
  const targetError = messages.errors.users_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Check if buttons exist
  const buttons = target.querySelectorAll("[data-button=statistics]");
  const buttonsError = messages.errors.users_info_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonsError.message, buttonsError.description);
  buttons.forEach((button) => {
    //* Add event listener to each button
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get the user id
      const id = button.dataset.value;
      //* Try to list the user statistics
      await fetch(`/api/scores/list/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then(async (response) => {
          if (response.status === 200) {
            return response.text().then(async (data) => {
              //* Open modal
              const email = button.dataset.email;
              await createModal({
                type: "statistics",
                table: "scores",
                id: id,
                data: {
                  email: email,
                  scores: data,
                },
              });
              return Promise.resolve();
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
  });
};

/**
 * Blokuje użytkownika w panelu administracyjnym.
 *
 * @async
 * @function userBlock
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {HTMLElement} target - Element tbody tabeli do wypełnienia danymi użytkowników.
 * @property {NodeList} buttons - Lista przycisków blokowania użytkownika.
 * @property {HTMLElement} button - Przycisk blokowania użytkownika.
 * @property {string} id - ID użytkownika.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Obiekt z danymi odpowiedzi w formacie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy użytkownik zostanie zablokowany.
 * @property {error} targetError - Komunikat o błędzie, gdy nie zostanie znaleziony element tbody tabeli.
 * @property {error} buttonsError - Komunikat o błędzie, gdy nie zostaną znalezione przyciski blokowania użytkownika.
 * @throws {Error} Wyświetla komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! User block
const userBlock = async () => {
  //* Check if target exists
  const target = document.querySelector(".admin-list-items-users-table tbody");
  const targetError = messages.errors.users_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Check if buttons exist
  const buttons = target.querySelectorAll("[data-button=block]");
  const buttonsError = messages.errors.users_info_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonsError.message, buttonsError.description);
  buttons.forEach((button) => {
    //* Add event listener to each button
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get the user id
      const id = button.dataset.value;
      //* Try to block the user
      await fetch(`/api/user/block/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then(async (response) => {
          if (response.status === 200) {
            return response.json().then(async (data) => {
              await listUsers();
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
  });
};

/**
 * Pobiera i wyświetla listę użytkowników w panelu administracyjnym i włącza funkcje pomocnicze.
 *
 * @async
 * @function listUsers
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link getSVG} - Funkcja zwracająca kod SVG.
 * @see {@link editTerm} - Funkcja edytująca semestr użytkownika.
 * @see {@link sendNotification} - Funkcja wysyłająca powiadomienie do użytkownika.
 * @see {@link copyCode} - Funkcja kopiująca kod aktywacyjny.
 * @see {@link userBlock} - Funkcja blokująca użytkownika.
 * @see {@link userStatistics} - Funkcja wyświetlająca statystyki użytkownika.
 * @see {@link changeRole} - Funkcja zmieniająca rolę użytkownika.
 * @see {@link createTable} - Funkcja tworząca tabelę.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} data - Lista użytkowników.
 * @property {HTMLElement} target - Element tbody tabeli do wypełnienia danymi użytkowników.
 * @property {Function} createRow - Funkcja tworząca wiersz tabeli z danymi użytkownika.
 * @property {HTMLElement} clockSVG - Kod SVG zegara.
 * @property {HTMLElement} calendarSVG - Kod SVG kalendarza.
 * @property {HTMLElement} copySVG - Kod SVG kopiowania.
 * @property {HTMLElement} lockSVG - Kod SVG blokady.
 * @property {HTMLElement} unlockSVG - Kod SVG odblokowania.
 * @property {HTMLElement} editSVG - Kod SVG edycji.
 * @property {HTMLElement} sendNotificationSVG - Kod SVG wysyłania powiadomienia.
 * @property {HTMLElement} userStatisticsSVG - Kod SVG statystyk użytkownika.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy lista użytkowników zostanie pobrana i wyświetlona.
 * @property {error} targetError - Komunikat o błędzie, gdy nie zostanie znaleziony element tbody tabeli.
 * @throws {Error} Wyświetla komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! List users
export const listUsers = async () => {
  await fetch("/api/user/list")
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.json().then(async (data) => {
        //* Check if target exists
        const target = document.querySelector(".admin-list-items-users-table tbody");
        const targetError = messages.errors.users_table_not_found;
        if (!target) return showMessage(targetError.message, targetError.description);
        //* Get SVGs
        const clockSVG = getSVG("clock");
        const calendarSVG = getSVG("calendar");
        const copySVG = getSVG("copy");
        const lockSVG = getSVG("lock");
        const unlockSVG = getSVG("unlock");
        const editSVG = getSVG("edit");
        const sendNotificationSVG = getSVG("sendNotification");
        const userStatisticsSVG = getSVG("userStatistics");
        //* List of all elements
        const createRow = (item) => ({
          tag: "tr",
          attributes: { role: "row" },
          children: [
            //* User emails
            {
              tag: "td",
              attributes: { role: "cell", "aria-labelledby": "col-users-email-table" },
              dataset: {
                label: `${messages.texts.users_table_emails}: `,
              },
              children: [
                {
                  tag: "div",
                  classes: ["table-td-content", "align-left"],
                  children: [
                    {
                      tag: "span",
                      content: item.email.toString() || 0,
                      attributes: {
                        "aria-label": item.email.toString() || 0,
                      },
                      children: [
                        {
                          tag: "sub",
                          classes: ["role"],
                          children: [
                            {
                              tag: "select",
                              properties: {
                                name: "role",
                              },
                              dataset: {
                                id: item._id,
                              },
                              children: [
                                {
                                  tag: "option",
                                  content: messages.info.role_user_short,
                                  attributes: {
                                    value: 1,
                                  },
                                  properties: {
                                    selected:
                                      item.role.toString() == messages.info.role_user_short
                                        ? "selected"
                                        : "",
                                  },
                                },
                                {
                                  tag: "option",
                                  content: messages.info.role_moderator_short,
                                  attributes: {
                                    value: 2,
                                  },
                                  properties: {
                                    selected:
                                      item.role.toString() == messages.info.role_moderator_short
                                        ? "selected"
                                        : "",
                                  },
                                },
                                {
                                  tag: "option",
                                  content: messages.info.role_admin_short,
                                  attributes: {
                                    value: 0,
                                  },
                                  properties: {
                                    selected:
                                      item.role.toString() == messages.info.role_admin_short
                                        ? "selected"
                                        : "",
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            //* Last login
            {
              tag: "td",
              attributes: { role: "cell", "aria-labelledby": "col-users-login-table" },
              children: [
                {
                  tag: "div",
                  classes: ["table-td-content"],
                  children: [
                    {
                      tag: "p",
                      content: calendarSVG,
                    },
                    {
                      tag: "p",
                      content: item.last_login_date || messages.info.never_login,
                      attributes: {
                        "aria-label": item.last_login_date || messages.info.never_login,
                      },
                    },
                    {
                      tag: "p",
                      content: clockSVG,
                    },
                    {
                      tag: "p",
                      content: item.last_login_time || messages.info.never_login,
                      attributes: {
                        "aria-label": item.last_login_time || messages.info.never_login,
                      },
                    },
                  ],
                },
              ],
            },
            //* Copy code
            {
              tag: "td",
              attributes: {
                role: "cell",
                "aria-labelledby": "col-users-code-table",
              },
              dataset: {
                label: `${messages.texts.users_table_code}: `,
              },
              children: [
                {
                  tag: "div",
                  classes: ["table-td-content"],
                  children: [
                    {
                      tag: "span",
                      content: item.code || messages.info.no_code,
                      attributes: {
                        "aria-label": item.code || messages.info.no_code,
                      },
                    },
                    {
                      tag: "button",
                      content: copySVG,
                      properties: {
                        type: "button",
                      },
                      dataset: {
                        value: item.code || null,
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
            //* User terms
            {
              tag: "td",
              attributes: { role: "cell", "aria-labelledby": "col-users-terms-table" },
              dataset: {
                label: `${messages.texts.users_table_terms}: `,
              },
              children: [
                {
                  tag: "div",
                  classes: ["table-td-content"],
                  children: [
                    {
                      tag: "span",
                      content: item.terms || messages.info.no_terms,
                      attributes: {
                        "aria-label": item.terms || messages.info.no_terms,
                      },
                    },
                    {
                      tag: "button",
                      content: editSVG,
                      properties: {
                        type: "button",
                      },
                      dataset: {
                        id: item.terms_id,
                        field: "term",
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
            //* User actions
            {
              tag: "td",
              attributes: { role: "cell", "aria-labelledby": "col-users-actions-table" },
              children: [
                {
                  tag: "div",
                  classes: ["table-td-content"],
                  children: [
                    {
                      tag: "button",
                      content: item.blocked == true ? lockSVG : unlockSVG,
                      properties: {
                        type: "button",
                      },
                      dataset: {
                        value: item._id,
                        button: "block",
                      },
                      attributes: {
                        "aria-label": item.blocked == true ? "Unblock user" : "Block user",
                        role: "button",
                      },
                    },
                    {
                      tag: "button",
                      content: userStatisticsSVG,
                      properties: {
                        type: "button",
                      },
                      dataset: {
                        value: item._id,
                        email: item.email,
                        button: "statistics",
                      },
                      attributes: {
                        "aria-label": "User statistics",
                        role: "button",
                      },
                    },
                    {
                      tag: "button",
                      content: sendNotificationSVG,
                      properties: {
                        type: "button",
                      },
                      dataset: {
                        value: item._id,
                        email: item.email,
                        button: "notification",
                      },
                      attributes: {
                        "aria-label": "Send notification",
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
          firstRow: false,
          colNumbers: 5,
          createRow: createRow,
        });
        //* Run functions to copy activation codes, statistics, notifications, user info
        if (data.length > 0) {
          editTerm(".admin-list-items-users-table tbody");
          sendNotification(".admin-list-items-users-table tbody");
          copyCode(".admin-list-items-users-table button[data-button='copy']");
          userBlock();
          userStatistics();
          changeRole();
        }
        return Promise.resolve();
      });
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};
