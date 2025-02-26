import { showMessage, messages } from "./messages.js";
import { preload } from "./preloader.js";
import { changeActiveItem } from "./navbar.js";

/**
 * Ładuje zawartość na podstawie widoku.
 *
 * @async
 * @function loadContent
 * @see {@link initContent} - Funkcja inicjalizująca zawartość na podstawie widoku.
 * @see {@link preload} - Funkcja pokazująca preloader.
 * @see {@link changeActiveItem} - Funkcja zmieniająca aktywny element nawigacji.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @property {string} src - Źródło zawartości do załadowania.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {string} data - Dane z odpowiedzi w formie tekstu.
 * @property {HTMLElement} main - Główny element zawartości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po załadowaniu zawartości.
 * @property {error} errorMsg - Komunikat o błędzie, jeśli zawartość nie zostanie znaleziona.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Load content based on view
export const loadContent = async (src) => {
  if (!src || src == "/api/main") {
    localStorage.setItem("view", "/api/main");
    await initContent("/api/main");
    return await preload();
  }
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error("content_not_found");
    const data = await response.text();
    if (!data) throw new Error("content_not_found");
    const main = document.querySelector("main");
    if (!main) throw new Error("main_not_found");
    localStorage.setItem("view", src);
    main.innerHTML = data;
    await initContent(src);
  } catch (error) {
    const errorMsg = messages.errors[error.message] || messages.errors.content_not_found;
    showMessage(errorMsg.message, errorMsg.description);
  } finally {
    await preload();
    await changeActiveItem(src);
  }
  return Promise.resolve();
};

/**
 * Przełącza elementy panelu.
 *
 * @function toggleElements
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {NodeList} elements - Lista elementów do przełączenia.
 * @property {HTMLElement} element - Element do przełączenia.
 * @property {HTMLElement} newElement - Sklonowany element do przełączenia.
 * @property {HTMLElement} target - Element docelowy do przełączenia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po przełączeniu elementów.
 * @property {error} foldError - Komunikat o błędzie, jeśli przełączenie się nie powiedzie.
 * @property {error} elementsError - Komunikat o błędzie, jeśli elementy nie zostaną znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Toggle panel elements
export const toggleElements = () => {
  //* Error messages
  const foldError = messages.errors.failed_to_fold;
  const elementsError = messages.errors.fold_button_not_found;
  //* Check if elements exist
  const elements = document.querySelectorAll("[data-foldable=button]");
  if (!elements || elements.length <= 0)
    return showMessage(elementsError.message, elementsError.description);
  //* Add event listener to each element
  elements.forEach((element) => {
    const newElement = element.cloneNode(true);
    element.replaceWith(newElement);
    newElement.addEventListener("click", (e) => {
      //* Get and toggle target
      const target = newElement.parentElement;
      if (target) {
        target.classList.toggle("hide");
      } else {
        return showMessage(foldError.message, foldError.description);
      }
    });
  });
  return Promise.resolve();
};

/**
 * Inicjalizuje zawartość na podstawie widoku.
 *
 * @async
 * @function initContent
 * @see {@link navBar} - Funkcja obsługująca nawigację.
 * @see {@link initPanel} - Funkcja inicjalizująca panel administracyjny.
 * @see {@link initNotification} - Funkcja inicjalizująca powiadomienia.
 * @see {@link initScore} - Funkcja inicjalizująca wyniki.
 * @see {@link initReport} - Funkcja inicjalizująca raporty.
 * @see {@link initAccount} - Funkcja inicjalizująca konto użytkownika.
 * @see {@link initMain} - Funkcja inicjalizująca stronę główną.
 * @param {string} view - Widok strony.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po inicjalizacji zawartości.
 */
//! Initialize content based on view
const initContent = async (view) => {
  await import("./navbar.js").then(({ navBar }) => navBar());
  switch (view) {
    case "/api/panel":
      return await import("../admin.js").then(({ initPanel }) => initPanel());
    case "/api/notification":
      return await import("./notification.js").then(({ initNotification }) => initNotification());
    case "/api/scores":
      return await import("./score.js").then(({ initScore }) => initScore());
    case "/api/report":
      return await import("./report.js").then(({ initReport }) => initReport());
    case "/api/account":
      return await import("./account.js").then(({ initAccount }) => initAccount());
    case "/api/main":
      return await import("./main.js").then(({ initMain }) => initMain());
    default:
      return Promise.resolve();
  }
};
