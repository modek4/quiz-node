import { showMessage, messages } from "./messages.js";
import { showChangePreloader } from "./preloader.js";
import { loadContent } from "./content.js";

/**
 * Elementy paska nawigacyjnego z ich odpowiednimi źródłami.
 *
 * @constant {Object[]} navItems
 * @property {string} selector - Selektor elementu paska nawigacyjnego.
 * @property {string} src - Źródło podstrony.
 * @default {string} reload - Odświeżenie strony.
 * @default {string} /api/panel - Panel administratora.
 * @default {string} /api/report - Raporty.
 * @default {string} /api/notification - Powiadomienia.
 * @default {string} /api/scores - Wyniki.
 * @default {string} /api/account - Profil użytkownika.
 * @default {string} /api/auth/logout - Wylogowanie użytkownika.
 */
//? Navbar items with their respective sources
const navItems = [
  { selector: ".navbar-items-home", src: "reload" },
  { selector: ".navbar-items-admin", src: "/api/panel" },
  { selector: ".navbar-items-report", src: "/api/report" },
  { selector: ".navbar-items-notifications", src: "/api/notification" },
  { selector: ".navbar-items-scores", src: "/api/scores" },
  { selector: ".navbar-items-profile", src: "/api/account" },
  { selector: ".navbar-items-logout", src: "/api/auth/logout" },
];

/**
 * Ustawia nasłuchiwacz zdarzeń na elemencie.
 *
 * @function setupListener
 * @param {HTMLElement} element - Element, na którym ma być ustawiony nasłuchiwacz.
 * @param {function} callback - Funkcja obsługująca zdarzenie.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po ustawieniu nasłuchiwacza zdarzeń.
 */
//! Universal event listener
const setupListener = (element, callback) => {
  const newElement = element.cloneNode(true);
  element.replaceWith(newElement);
  newElement.addEventListener("click", callback);
  return Promise.resolve();
};

/**
 * Inicjalizuje pasek nawigacyjny.
 *
 * @function navBar
 * @see {@link navBarAction} - Funkcja obsługująca akcje paska nawigacyjnego.
 * @see {@link setupListener} - Funkcja ustawiająca nasłuchiwacz zdarzeń.
 * @property {HTMLElement} open - Przycisk otwierający pasek nawigacyjny.
 * @property {HTMLElement} close - Przycisk zamykający pasek nawigacyjny.
 * @property {HTMLElement} nav - Element paska nawigacyjnego.
 * @property {Object[]} navItems - Tablica obiektów z selektorami i źródłami podstron.
 * @property {function} toggleNav - Funkcja przełączająca pasek nawigacyjny.
 * @property {function} handleMediaQuery - Funkcja obsługująca zmianę rozmiaru ekranu.
 * @property {Object} mediaQuery - Obiekt zapytania o zmianę rozmiaru ekranu.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po inicjalizacji paska nawigacyjnego.
 * @property {error} errorMessage - Komunikat o błędzie, jeśli elementy paska nawigacyjnego nie zostaną znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Navbar
export const navBar = () => {
  //* Check if elements exist
  const open = document.querySelector(".navbar-open");
  const close = document.querySelector(".navbar-close");
  const nav = document.querySelector(".navbar");
  const errorMessage = messages.navbar_elements_not_found;
  if (!open || !close || !nav) return showMessage(errorMessage.message, errorMessage.description);
  //* Subpages event listeners
  navItems.forEach((item) => navBarAction(item.selector, item.src));
  //* Toggle navbar
  const toggleNav = () => nav.classList.toggle("active");
  //* Open listeners
  setupListener(open, (e) => {
    e.stopPropagation();
    toggleNav();
  });
  //* Close listeners
  setupListener(close, (e) => {
    e.stopPropagation();
    nav.classList.remove("active");
  });
  //* Auto close or open navbar based on screen size
  const handleMediaQuery = (e) => {
    nav.classList.toggle("active", !e.matches);
  };
  const mediaQuery = window.matchMedia("(max-width: 1024px)");
  mediaQuery.addEventListener("change", handleMediaQuery);
  handleMediaQuery(mediaQuery);
  return Promise.resolve();
};

/**
 * Zmienia aktywny element w pasku nawigacyjnym.
 *
 * @async
 * @function changeActiveItem
 * @param {string} src - Źródło zawartości.
 * @param {Array} [items=navItems] - Lista elementów paska nawigacyjnego. Domyślnie {@link navItems}.
 * @property {HTMLElement} element - Element paska nawigacyjnego.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie aktywnego elementu.
 */
//! Change active item in the navbar
export const changeActiveItem = async (src, items = navItems) => {
  items.forEach((item) => {
    const element = document.querySelector(item.selector);
    if (element) element.classList.toggle("active", item.src === src);
  });
  return Promise.resolve();
};

/**
 * Obsługuje akcje paska nawigacyjnego.
 *
 * @function navBarAction
 * @see {@link showChangePreloader} - Funkcja pokazująca preloader.
 * @see {@link loadContent} - Funkcja ładująca zawartość.
 * @see {@link logout} - Funkcja wylogowująca użytkownika.
 * @param {string} menu - Selektor elementu menu.
 * @param {string} src - Źródło zawartości.
 * @property {HTMLElement} element - Element paska nawigacyjnego.
 * @property {HTMLElement} newElement - Sklonowany element paska nawigacyjnego.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po obsłużeniu akcji paska nawigacyjnego.
 */
//! Navigation bar action event
const navBarAction = (menu, src) => {
  //* Check if elements exist
  const element = document.querySelector(menu);
  if (!element) return;
  //* Transition event listener
  const newElement = element.cloneNode(true);
  element.replaceWith(newElement);
  newElement.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Show preloader
    await showChangePreloader(e);
    //* Load content
    try {
      //* Check if user wants to logout
      if (src === "/api/auth/logout") await logout();
      if (src === "reload") {
        //* Reload main page
        localStorage.removeItem("view");
        location.reload();
      } else {
        await loadContent(src);
      }
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to load content from", src, error);
    }
  });
};

/**
 * Wylogowuje użytkownika.
 *
 * @async
 * @function logout
 * @property {Response} res - Odpowiedź z serwera.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wylogowaniu użytkownika.
 * @throws {error} Komunikat o błędzie, jeśli nie uda się wylogować użytkownika.
 */
//! Logout user
const logout = async () => {
  //* Remove token from local storage
  localStorage.removeItem("auth-token");
  //* Logout user
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 200) return Promise.resolve((window.location.href = "/"));
  return Promise.reject(new Error("Failed to logout"));
};
