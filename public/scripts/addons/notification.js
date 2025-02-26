import { messages, showMessage } from "./messages.js";
import { createModal, closeModal } from "./modal.js";
import { getSVG } from "./svg.js";
import { createElement } from "./element.js";

/**
 * Inicjalizuje powiadomienia, ładując listę powiadomień.
 *
 * @async
 * @function initNotification
 * @see {@link listNotifications} - Funkcja listująca powiadomienia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po załadowaniu powiadomień.
 */
//! Load necessary functions
export const initNotification = () => {
  return Promise.all([listNotifications()]);
};

/**
 * Wysyła powiadomienie na podstawie wypełnionego formularza.
 *
 * @async
 * @function sendNotification
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {string} tbody - Selektor elementu zawierającego przyciski powiadomień.
 * @property {HTMLElement} body - Element zawierający przyciski powiadomień.
 * @property {HTMLElement[]} buttons - Lista przycisków powiadomień.
 * @property {HTMLElement} button - Przycisk powiadomienia.
 * @property {HTMLElement} newButton - Kopia przycisku powiadomienia.
 * @property {string} id - ID użytkownika.
 * @property {string} email - Adres e-mail użytkownika.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {string} contentRegex - Wyrażenie regularne dla sprawdzenia treści powiadomienia.
 * @property {Object} dataNotification - Dane z odpowiedzi.
 * @property {string} dataNotification.id - ID użytkownika.
 * @property {string} dataNotification.field - Pole powiadomienia.
 * @property {string} dataNotification.value - Treść powiadomienia.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wysłaniu powiadomienia.
 * @property {error} bodyError - Komunikat o błędzie, jeśli element zawierający przyciski powiadomień nie zostanie znaleziony.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przyciski powiadomień nie zostaną znalezione.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @property {error} contentError - Komunikat o błędzie, jeśli treść powiadomienia jest nieprawidłowa.
 * @property {error} dataError - Komunikat o błędzie, jeśli dane powiadomienia są nieprawidłowe.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Send notification
export const sendNotification = async (tbody) => {
  //* Check if table body exists
  const body = document.querySelector(tbody);
  const bodyError = messages.errors.send_notification_data_not_found;
  if (!body) return showMessage(bodyError.message, bodyError.description);
  //* Check if buttons exist
  const buttons = body.querySelectorAll("[data-button=notification]");
  const buttonsError = messages.errors.send_notification_button_not_found;
  if (!buttons) return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Send notification
    const sendNotification = async (e) => {
      e.preventDefault();
      //* Get values
      const id = button.dataset.value;
      const email = button.dataset.email;
      //* Open modal
      const modal = await createModal({
        type: "notification",
        table: "notifications",
        id: id,
        data: {
          email: email,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dataNotification = {
          id: id,
          field: "content",
          value: form.content.value.trim(),
        };
        //* Check if the value is valid
        const contentError = messages.errors.notification_content_not_valid;
        const contentRegex = /^[a-zA-Z0-9\s\.\,\!\?\-\_\:\(\)ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{1,1024}$/;
        if (!contentRegex.test(dataNotification.value))
          return showMessage(contentError.message, contentError.description);
        const dataError = messages.errors.notification_data_not_found;
        if (
          !dataNotification.id ||
          !dataNotification.field ||
          !dataNotification.value ||
          dataNotification.value === ""
        )
          return showMessage(dataError.message, dataError.description);
        //* Send data to the server
        await fetch(`/api/notification/send/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: dataNotification.value }),
        })
          //* Check response
          .then(async (response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
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
    newButton.addEventListener("click", sendNotification);
  });
  return;
};

/**
 * Formatuje datę na podstawie obiektu daty.
 *
 * @function getFormatedDate
 * @param {Date} date - Obiekt daty.
 * @property {Date} d - Obiekt daty przekonwertowany z wartości daty.
 * @property {Object} options - Opcje formatowania daty.
 * @returns {string} Sformatowana data.
 */
//! Date formatting
const getFormatedDate = (date) => {
  const d = new Date(date);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  return d.toLocaleDateString("us-US", options);
};

/**
 * Tworzy elementy listy powiadomień i dodaje je do elementu docelowego.
 *
 * @async
 * @function createNotificationList
 * @see {@link getSVG} - Funkcja pobierająca kod SVG.
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {Object[]} data - Dane powiadomień.
 * @param {HTMLElement} target - Element docelowy listy powiadomień.
 * @property {string} flagSVG - Kod SVG ikony flagi.
 * @property {HTMLElement} item - Element listy powiadomień.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu elementów listy powiadomień.
 */
//! Create notification list
const createNotificationList = async (data, target) => {
  //* Clear the target
  target.innerHTML = "";
  //* Get SVGs
  const flagSVG = getSVG("flag");
  if (data.length !== 0) {
    //* Create notification list
    const item = createElement({
      tag: "li",
      classes: ["notification-list-items-item", "mark-as-read"],
      attributes: { role: "listitem" },
      dataset: { email: data[0].email },
      children: [
        {
          tag: "div",
          classes: ["notification-list-items-item-content"],
          children: [
            {
              tag: "span",
              attributes: { "aria-label": messages.texts.clear_notifications },
              content: messages.texts.clear_notifications,
            },
          ],
        },
        {
          tag: "div",
          classes: ["notification-list-items-item-read"],
          content: flagSVG,
        },
      ],
    });
    target.appendChild(item);
    //* List of all elements
    data.forEach((notification) => {
      //* Date formatting
      const date = getFormatedDate(notification.date);
      //* Create elements
      const item = createElement({
        tag: "li",
        classes: ["notification-list-items-item"],
        attributes: { role: "listitem" },
        dataset: { id: notification._id },
        children: [
          {
            tag: "div",
            classes: ["notification-list-items-item-content"],
            children: [
              {
                tag: "span",
                attributes: { "aria-label": notification.content },
                content: notification.content,
              },
              {
                tag: "span",
                attributes: { "aria-label": notification.date },
                content: date,
              },
            ],
          },
          {
            tag: "div",
            classes: ["notification-list-items-item-read"],
            content: flagSVG,
          },
        ],
      });
      target.appendChild(item);
    });
  } else {
    //* Create no notifications message
    const item = createElement({
      tag: "li",
      classes: ["notification-list-items-item"],
      attributes: { role: "listitem" },
      children: [
        {
          tag: "div",
          classes: ["notification-list-items-item-content", "read"],
          children: [
            {
              tag: "span",
              attributes: { "aria-label": messages.texts.no_notifications },
              content: messages.texts.no_notifications,
            },
          ],
        },
        {
          tag: "div",
          classes: ["notification-list-items-item-read", "filled"],
          content: flagSVG,
        },
      ],
    });
    target.appendChild(item);
  }
};

/**
 * Tworzy listę powiadomień ładując ją z serwera.
 *
 * @async
 * @function listNotifications
 * @see {@link createNotificationList} - Funkcja tworząca elementy listy powiadomień.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link readNotification} - Funkcja oznaczająca powiadomienia jako przeczytane.
 * @property {HTMLElement} list - Element listy powiadomień.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} data - Dane powiadomień.
 * @property {HTMLElement} target - Element docelowy listy powiadomień.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu listy powiadomień.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! List notifications
const listNotifications = async () => {
  const list = document.querySelector(".notification-list-items");
  if (!list) return;
  //* Load academies
  await fetch("/api/notification/list").then(async (response) => {
    if (response.status !== 200) {
      return response.json().then((error) => {
        showMessage(error.message, error.description);
      });
    }
    return response.json().then(async (data) => {
      //* Check if target exists
      const target = document.querySelector(".notification-list-items");
      const targetError = messages.errors.notification_list_not_found;
      if (!target) return showMessage(targetError.message, targetError.description);
      await createNotificationList(data, target);
      if (data.length > 0) readNotification(".notification-list-items");
    });
  });
};

/**
 * Wysyła status przeczytania powiadomienia na serwer.
 *
 * @async
 * @function sendReadStatus
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link listNotifications} - Funkcja listująca powiadomienia
 * @param {string} url - URL do wysłania statusu przeczytania.
 * @param {Object} [body=null] - Dane do wysłania.
 * @property {Object} options - Opcje zapytania.
 * @property {Method} options.method - Metoda zapytania.
 * @property {Object} options.headers - Nagłówki zapytania.
 * @property {JSON} options.body - Ciało zapytania.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wysłaniu statusu przeczytania.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Helper function to send read status to the server
const sendReadStatus = async (url, body = null) => {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  try {
    const response = await fetch(url, options);
    if (response.status === 200) {
      const data = await response.json();
      await listNotifications();
      showMessage(data.message, "", "success");
    } else {
      const error = await response.json();
      showMessage(error.message, error.description);
    }
  } catch (error) {
    showMessage(error.message, error.description);
  }
};

/**
 * Obsługuje kliknięcie powiadomienia.
 *
 * @async
 * @function handleNotificationClick
 * @see {@link sendReadStatus} - Funkcja wysyłająca status przeczytania.
 * @param {Event} e - Zdarzenie kliknięcia.
 * @property {HTMLElement} item - Element powiadomienia.
 * @property {HTMLElement} svg - Ikona powiadomienia.
 * @property {string} id - ID powiadomienia.
 * @property {string} email - Adres e-mail powiadomienia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po obsłużeniu kliknięcia powiadomienia.
 */
//! Read notification handler
const handleNotificationClick = async (e) => {
  e.preventDefault();
  //* Get the closest notification
  const item = e.target.closest(".notification-list-items-item");
  if (!item || item.classList.contains("read")) return;
  item.classList.add("read");
  const svg = item.querySelector("div.notification-list-items-item-read");
  if (svg) svg.classList.add("filled");
  //* Get the data
  const id = item.dataset.id;
  const email = item.dataset.email;
  //* Separate read and read all
  if (!item.classList.contains("mark-as-read")) {
    await sendReadStatus(`/api/notification/read/${id}`);
  } else {
    await sendReadStatus(`/api/notification/read`, { email });
  }
  return Promise.resolve();
};

/**
 * Oznacza powiadomienie jako przeczytane.
 *
 * @async
 * @function readNotification
 * @see {@link handleNotificationClick} - Funkcja obsługująca kliknięcie powiadomienia.
 * @see {@link showMessage} - Funka wyświetlająca komunikat.
 * @param {string} list - Selektor listy powiadomień.
 * @property {HTMLElement} target - Element listy powiadomień.
 * @property {NodeList} notifications - Lista powiadomień.
 * @property {HTMLElement} flag - Ikona powiadomienia.
 * @property {HTMLElement} newNotification - Sklonowana ikona powiadomienia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po oznaczeniu powiadomienia jako przeczytane.
 * @property {error} targetError - Komunikat o błędzie, jeśli element listy powiadomień nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Read notification
const readNotification = async (list) => {
  //* Check if target exists
  const target = document.querySelector(list);
  const targetError = messages.errors.notification_list_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get all notifications
  const notifications = target.querySelectorAll("li");
  if (!notifications) return;
  //* Add event listener to each notification
  notifications.forEach((notification) => {
    const flag = notification.querySelector(".notification-list-items-item-read");
    const newNotification = flag.cloneNode(true);
    flag.replaceWith(newNotification);
    newNotification.addEventListener("click", handleNotificationClick);
  });
};
