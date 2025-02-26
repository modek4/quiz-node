import { loadMessages, messages } from "./addons/messages.js";
import { preload } from "./addons/preloader.js";
import { particleCanvas } from "./addons/canvas.js";
import { setupForms } from "./addons/auth.js";

/**
 * Nasłuchuje zdarzenia DOMContentLoaded i ładuje wiadomości, funkcje oraz zawartość strony głównej. Ustawia tryb ciemny, jeśli jest włączony.
 *
 * @event index#DOMContentLoaded
 * @async
 * @function
 * @see {@link loadMessages} - Funkcja ładująca wiadomości.
 * @see {@link initIndex} - Funkcja inicjalizująca stronę główną.
 * @see {@link preload} - Funkcja preładowująca obrazy.
 * @property {string} darkmode - Tryb ciemny, jeśli jest włączony.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy wszystkie dane zostaną załadowane.
 * @throws {Error} Jeśli wystąpi błąd podczas ładowania wiadomości, funkcji lub zawartości.
 */
//! Load content if DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  try {
    //* Dark mode
    const darkmode = localStorage.getItem("darkmode") || false;
    darkmode === "true" ? document.body.classList.add("darkmode") : null;
    //* Load functions
    await loadMessages();
    await initIndex();
    await preload();
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to load index", error);
    throw new Error("Failed to load index");
  }
});

/**
 * Inicjalizuje stronę główną, uruchamiając wszystkie niezbędne funkcje.
 *
 * @function initIndex
 * @see {@link toggleFormDisplay} - Funkcja zmieniająca widoczność formularzy.
 * @see {@link setupForms} - Funkcja ustawiająca formularze.
 * @see {@link particleCanvas} - Funkcja tworząca animację tła.
 * @returns {Promise<void[]>} Obietnica, która rozwiązuje się, gdy wszystkie funkcje zostaną uruchomione.
 */
//! Initialize index page
const initIndex = () => {
  return Promise.all([
    toggleFormDisplay(),
    setupForms(),
    particleCanvas("header div:first-of-type"),
  ]);
};

/**
 * Ukrywa wszystkie formularze na stronie głównej.
 *
 * @function hideAllForms
 * @property {NodeList} forms - Lista wszystkich formularzy.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po ukryciu wszystkich formularzy.
 */
//! Hide all forms
const hideAllForms = () => {
  const forms = document.querySelectorAll(".sign-in, .sign-up, .forgot-password");
  if (!forms || forms.length <= 0) return Promise.resolve();
  forms.forEach((form) => {
    form.style.display = "none";
  });
  return Promise.resolve();
};

/**
 * Pokazuje wybrany formularz na stronie głównej.
 *
 * @function showForm
 * @param {string} formClass - Klasa formularza do pokazania.
 * @property {HTMLElement} form - Wybrany formularz.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pokazaniu formularza.
 */
//! Show selected form
const showForm = (formClass) => {
  const form = document.querySelector(`.${formClass}`);
  if (!form) return;
  form.style.display = "flex";
  document.querySelector("section").style.top = "0";
  return;
};

/**
 * Zmienia wyświetlanie formularzy na stronie głównej po kliknięciu przycisków.
 *
 * @function toggleFormDisplay
 * @see {@link hideAllForms} - Funkcja ukrywająca wszystkie formularze.
 * @see {@link showForm} - Funkcja pokazująca wybrany formularz.
 * @property {NodeList} buttons - Lista przycisków formularzy.
 * @property {HTMLElement} newButton - Sklonowany przycisk formularza.
 * @property {string} formToShow - Klasa formularza do pokazania.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu nasłuchiwania na przyciski formularzy.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przyciski formularzy nie zostaną znalezione.
 * @throws {Error} Wyświetla komunikat o błędzie, jeśli przyciski formularzy nie zostaną znalezione.
 */
//! Change form display
const toggleFormDisplay = () => {
  //* Check if elements exist
  const buttons = document.querySelectorAll(
    ".sign-up-button, .sign-in-button, .forgot-password-button"
  );
  //* Error message
  const buttonsError = messages.errors.buttons_form_not_found;
  if (buttons.length === 0) return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listeners
  buttons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", (e) => {
      //* Get form class
      const formToShow = e.target.classList[0].replace("-button", "");
      //* Hide all forms
      hideAllForms();
      //* Show selected form
      showForm(formToShow);
    });
  });
  return Promise.resolve();
};
