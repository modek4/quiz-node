import { showMessage, messages } from "./messages.js";

/**
 * Inicjalizuje funkcje formularzy, takie jak logowanie, rejestracja i resetowanie hasła.
 *
 * @function setupForms
 * @see {@link loginFormFunction} - Funkcja walidująca formularz logowania.
 * @see {@link registerFormFunction} - Funkcja walidująca formularz rejestracji.
 * @see {@link resetPasswordFormFunction} - Funkcja walidująca formularz resetowania hasła.
 * @returns {Promise<void[]>} Obietnica, która rozwiązuje się, gdy wszystkie funkcje formularzy zostaną uruchomione.
 */
//! Initialize forms functions
export const setupForms = () => {
  return Promise.all([loginFormFunction(), registerFormFunction(), resetPasswordFormFunction()]);
};

/**
 * Wyłącza przycisk submit i zmienia jego stan.
 *
 * @function submitOff
 * @param {HTMLInputElement} submit - Przycisk submit.
 * @property {string} submitOldValue - Poprzednia wartość przycisku submit.
 * @returns {string} Poprzednia wartość przycisku submit.
 */
//! Change submit button state
const submitOff = (submit) => {
  const submitOldValue = submit.value;
  submit.disabled = true;
  submit.style.cursor = "wait";
  submit.value = messages.info.loading;
  return submitOldValue;
};

/**
 * Włącza przycisk submit i przywraca jego stan.
 *
 * @function submitOn
 * @param {HTMLInputElement} submit - Przycisk submit.
 * @param {string} submitOldValue - Poprzednia wartość przycisku submit.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie stanu przycisku submit.
 */
//! Change submit button state
const submitOn = (submit, submitOldValue) => {
  submit.disabled = false;
  submit.style.cursor = "pointer";
  submit.value = submitOldValue;
  return Promise.resolve();
};

/**
 * Uniwersalna funkcja obsługi formularza.
 *
 * @function formFunction
 * @see {@link submitOff} - Funkcja wyłączająca przycisk submit.
 * @see {@link submitOn} - Funkcja włączająca przycisk submit.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @param {string} formClass - Klasa formularza.
 * @param {string} apiEndpoint - Endpoint API do wysłania danych formularza.
 * @param {Object} errorMessage - Komunikat o błędzie, jeśli formularz nie zostanie znaleziony.
 * @param {Function} getRequestBody - Funkcja pobierająca dane z formularza.
 * @param {string} onSuccessRedirect - URL do przekierowania po pomyślnym wysłaniu formularza.
 * @property {HTMLElement} target - Element formularza.
 * @property {HTMLInputElement} submit - Przycisk submit formularza.
 * @property {Object} body - Dane formularza.
 * @property {string} submitOldValue - Poprzednia wartość przycisku submit.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pomyślnym wysłaniu formularza.
 * @property {error} errorMessage - Komunikat o błędzie, jeśli formularz nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, jeśli formularz nie zostanie znaleziony.
 */
//! Universal form function
const formFunction = (formClass, apiEndpoint, errorMessage, getRequestBody, onSuccessRedirect) => {
  //* Check if elements exist
  const target = document.querySelector(formClass);
  if (!target) return showMessage(errorMessage.message, errorMessage.description);
  //* Form event listener
  target.addEventListener("submit", async (e) => {
    e.preventDefault();
    //* Get form elements
    const submit = e.target.querySelector("input[type='submit']");
    const body = getRequestBody(e.target);
    //* Change submit button state
    const submitOldValue = submitOff(submit);
    //* Fetch request
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status !== 200) {
        //* Display error message
        const data = await response.json();
        showMessage(data.message, data.description);
        submitOn(submit, submitOldValue);
        return;
      }
      //* Redirect on success
      location.href = onSuccessRedirect;
      return Promise.resolve();
    } catch (err) {
      console.error(err);
      submitOn(submit, submitOldValue);
      location.href = "/";
    }
  });
  return Promise.resolve();
};

/**
 * Walidacja formularza logowania.
 *
 * @function loginFormFunction
 * @see {@link formFunction} - Uniwersalna funkcja obsługi formularza.
 * @property {string} email - Adres email użytkownika.
 * @property {string} password - Hasło użytkownika.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po walidacji formularza logowania.
 */
//! Login form validation
const loginFormFunction = () => {
  formFunction(
    ".sign-in",
    "/api/auth/login",
    messages.errors.signin_form_not_found,
    (target) => ({
      email: target["sign-in-email"].value,
      password: target["sign-in-password"].value,
    }),
    "/api/main"
  );
  return Promise.resolve();
};

/**
 * Walidacja formularza rejestracji.
 *
 * @function registerFormFunction
 * @see {@link formFunction} - Uniwersalna funkcja obsługi formularza.
 * @property {string} email - Adres email użytkownika.
 * @property {string} name - Nazwa użytkownika.
 * @property {string} password - Hasło użytkownika.
 * @property {string} repassword - Powtórzone hasło użytkownika.
 * @property {string} code - Kod aktywacyjny użytkownika.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po walidacji formularza rejestracji.
 */
//! Register form validation
const registerFormFunction = () => {
  formFunction(
    ".sign-up",
    "/api/auth/register",
    messages.errors.signup_form_not_found,
    (target) => ({
      email: target["sign-up-email"].value,
      name: target["sign-up-email"].value.split("@")[0],
      password: target["sign-up-password"].value,
      repassword: target["sign-up-password-repeat"].value,
      code: target["sign-up-code"].value.toUpperCase(),
    }),
    "/api/main"
  );
  return Promise.resolve();
};

/**
 * Walidacja formularza resetowania hasła.
 *
 * @function resetPasswordFormFunction
 * @see {@link formFunction} - Uniwersalna funkcja obsługi formularza.
 * @property {string} email - Adres email użytkownika.
 * @property {string} password - Nowe hasło użytkownika.
 * @property {string} repassword - Powtórzone nowe hasło użytkownika.
 * @property {string} code - Kod aktywacyjny użytkownika.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po walidacji formularza resetowania hasła.
 */
//! Reset password form validation
const resetPasswordFormFunction = () => {
  formFunction(
    ".forgot-password",
    "/api/auth/resetpassword",
    messages.errors.forgot_password_form_not_found,
    (target) => ({
      email: target["forgot-password-email"].value,
      password: target["forgot-password-password"].value,
      repassword: target["forgot-password-password-repeat"].value,
      code: target["forgot-password-code"].value.toUpperCase(),
    }),
    "/api/main"
  );
  return Promise.resolve();
};
