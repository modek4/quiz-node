//! Messages object
export var messages = {};

/**
 * Ładuje wiadomości z pliku JSON na stronę JS.
 *
 * @async
 * @function loadMessages
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} messages - Obiekt zawierający wiadomości.
 * @returns {Promise<Object>} Obietnica, która rozwiązuje się po załadowaniu wiadomości.
 * @throws {error} Komunikat o błędzie, jeśli nie uda się załadować wiadomości.
 */
//! Load messages from JSON to JS side
export const loadMessages = async () => {
  try {
    const response = await fetch("/api/texts", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error().message;
    }
    messages = await response.json();
    return Promise.resolve(messages);
  } catch (error) {
    console.error("Failed to load texts", error);
    throw new Error("Failed to load texts");
  }
};

/**
 * Usuwa ukryte wiadomości po określonym czasie.
 *
 * @function removeHiddenMessages
 * @param {HTMLElement} validInfo - Element zawierający wiadomości.
 * @returns {void}
 */
//! Remove hide messages
const removeHiddenMessages = (validInfo) => {
  setTimeout(() => {
    validInfo.querySelectorAll("p.hide").forEach((p) => {
      p.remove();
    });
  }, 150); //? 150 ms delay
  return Promise.resolve();
};

/**
 * Wyświetla wiadomość na stronie.
 *
 * @function showMessage
 * @param {string} [message="Failed to show message"] - Treść wiadomości.
 * @param {string} [description="Failed to show description"] - Opis wiadomości.
 * @param {string} [state="error"] - Stan wiadomości (info, success, error).
 * @property {number} messageVisibleTime - Czas wyświetlania wiadomości (w ms).
 * @property {HTMLElement} validInfo - Element zawierający wiadomości.
 * @property {HTMLElement} novalidInfoMessage - Nowa wiadomość.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wyświetleniu wiadomości.
 * @throws {error} Komunikat o błędzie, jeśli nie uda się wyświetlić wiadomości.
 */
//! Show error message
export const showMessage = (
  message = "Failed to show message",
  description = "Failed to show description",
  state = "error"
) => {
  const messageVisibleTime = 3000; //? Visible time 3 seconds
  //* Check if elements exist
  var validInfo = document.querySelector(".novalid");
  if (!validInfo) return console.error("No valid info");
  //* Create new message
  var novalidInfoMessage = document.createElement("p");
  //* Add class based on state
  switch (state) {
    case "info":
      novalidInfoMessage.classList.add("info");
      break;
    case "success":
      novalidInfoMessage.classList.add("success");
      break;
    case "error":
      novalidInfoMessage.classList.add("error");
    default:
      console.error(description);
      break;
  }
  //* Add message to the element
  novalidInfoMessage.innerHTML = message;
  validInfo.prepend(novalidInfoMessage);
  novalidInfoMessage.classList.remove("hide");
  //* Remove message after messageVisibleTime ms
  setTimeout(() => {
    novalidInfoMessage.classList.add("hide");
    removeHiddenMessages(validInfo);
  }, messageVisibleTime);
  return Promise.resolve();
};
