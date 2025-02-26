import { showMessage, messages } from "./messages.js";
import { createElement } from "./element.js";

/**
 * Pokazuje lub ukrywa preloader.
 *
 * @async
 * @function preload
 * @param {boolean} [state=false] - Stan preloadera.
 * @property {HTMLElement} preloader - Element preloadera.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pokazaniu lub ukryciu preloadera.
 * @property {error} preloaderError - Komunikat o błędzie, jeśli preloader nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Preloader
export const preload = async (state = false) => {
  try {
    //* Check if elements exist
    const preloader = document.querySelector(".preloader");
    const preloaderError = messages.errors.preloader_not_found;
    if (!preloader) return showMessage(preloaderError.message, preloaderError.description);
    //* Show or hide preloader
    if (state) {
      //* Show preloader
      preloader.classList.remove("hide");
      preloader.style.display = "flex";
    } else {
      //* Hide preloader
      preloader.classList.add("hide");
      setTimeout(() => {
        preloader.style.display = "none";
      }, 300); //? 300ms => 250ms (CSS transition) + 50ms (JS delay)
    }
  } catch (error) {
    console.error("Failed to load preloader", error);
  }
};

/**
 * Pokazuje preloader przy zmianie elementów.
 *
 * @async
 * @function showChangePreloader
 * @see {@link preload} - Funkcja pokazująca preloader.
 * @see {@link createElement} - Funkcja tworząca element.
 * @param {HTMLElement} modal - Element modala.
 * @param {Event} event - Zdarzenie kliknięcia.
 * @property {HTMLElement} circle - Element okręgu przejścia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pokazaniu preloadera.
 */
//! Helper function to show preloader
export const showChangePreloader = async (event = null) => {
  //* Create transition circle
  const circle = createElement({
    tag: "div",
    classes: ["transition-circle"],
  });
  document.body.appendChild(circle);
  //* Set circle position
  if (event === null) {
    circle.style.left = 100 / 2 + "vw";
    circle.style.top = 100 / 2 + "vh";
  } else {
    circle.style.left = `${event.clientX}px`;
    circle.style.top = `${event.clientY}px`;
  }
  //* Transition circle animation time
  await new Promise((resolve) => setTimeout(resolve, 260)); //? 260ms => 250ms (CSS transition) + 10ms (JS delay)
  //* Show preloader
  preload(true);
  //* Remove circle
  circle.remove();
  return Promise.resolve();
};
