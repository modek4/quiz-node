import { showMessage, messages } from "./messages.js";
import { createModal, closeModal } from "./modal.js";
import { preload, showChangePreloader } from "./preloader.js";

/**
 * Inicjalizuje funkcje kart na stronie głównej.
 *
 * @async
 * @function cardFunctions
 * @see {@link cardLike} - Funkcja obsługująca kliknięcie w przycisk polubienia karty.
 * @see {@link cardQuizMenu} - Funkcja obsługująca kliknięcie w kartę.
 * @param {List} cards - Element listy kart.
 * @property {NodeList} target - Lista elementów kart.
 * @property {string} likeLoc - Lokalizacja przycisku polubienia.
 * @property {HTMLElement} like - Przycisk polubienia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po uruchomieniu funkcji kart.
 */
//! List all card functions
export const cardFunctions = async (cards) => {
  //* Check if elements exist
  const target = cards.querySelectorAll("li");
  if (!target) return Promise.resolve();
  //* Like location
  const likeLoc = ".list-items-card-content-icons-like";
  //* Add like event
  target.forEach((item) => {
    item.addEventListener("click", async (e) => {
      if (e.target.closest(likeLoc)) {
        //* If like button is clicked
        e.stopPropagation();
        const like = e.target.closest(likeLoc);
        await cardLike(like);
      } else {
        //* If card is clicked
        await cardQuizMenu(item);
      }
    });
  });
  return Promise.resolve();
};

/**
 * Rozpoczyna menu quizu po kliknięciu w kartę.
 *
 * @async
 * @function cardQuizMenu
 * @see {@link createModal} - Funkcja tworząca modal.
 * @see {@link closeModal} - Funkcja zamykająca modal.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link preload} - Funkcja pokazująca preloader.
 * @see {@link navBar} - Funkcja obsługująca nawigację.
 * @see {@link quizFunctions} - Funkcja obsługująca quiz.
 * @param {HTMLElement} item - Element karty.
 * @property {string} id - ID quizu.
 * @property {number} question_count - Liczba pytań w quizie.
 * @property {HTMLElement} modal - Element modala.
 * @property {HTMLFormElement} form - Formularz modala.
 * @property {NodeList} inputs - Lista inputów formularza.
 * @property {Object} dataQuiz - Dane formularza potrzebne do uruchomienia quizu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {string} data - Dane z odpowiedzi w formie HTML.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po uruchomieniu menu quizu.
 * @property {error} modalError - Komunikat o błędzie, jeśli modal nie zostanie znaleziony.
 * @property {error} inputsError - Komunikat o błędzie, jeśli inputy nie zostaną znalezione.
 * @property {error} mainError - Komunikat o błędzie, jeśli element main nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Start menu
const cardQuizMenu = async (item) => {
  if (!item) return;
  //* Get data
  const id = item.dataset.id;
  const question_count = parseInt(
    item.querySelector(".list-items-card-content-icons-amount").innerText
  );
  if (!id || !question_count) return;
  //* Open modal
  const modal = await createModal({
    type: "quiz",
    table: "quiz",
    id: id,
    data: { question_count: question_count, title: item.dataset.title },
    texts: {
      delete_text: messages.texts.quiz_start_text,
    },
  });
  //* Check if elements exist
  const form = modal.querySelector("form");
  const modalError = messages.errors.modal_not_found;
  if (!modal || !form) return showMessage(modalError.message, modalError.description);
  //* Get inputs
  const inputs = form.querySelectorAll("input");
  const inputsError = messages.errors.input_not_found;
  if (!inputs || inputs.length <= 0) {
    closeModal(modal);
    return showMessage(inputsError.message, inputsError.description);
  }
  //* Start quiz
  await cardStartQuiz(form, inputs, modal, id);
  return Promise.resolve();
};

const cardStartQuiz = async (form, inputs, modal, id) => {
  //* Add event listener to form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    //* Get data
    const dataQuiz = {};
    inputs.forEach((input) => {
      if (input.name === "id" || input.name === "table") return;
      if (input.type === "checkbox") {
        dataQuiz[input.name] = input.checked;
        return;
      } else if (input.type === "hidden") {
        dataQuiz[input.name] = input.value;
        return;
      } else if (input.type === "number") {
        dataQuiz[input.name] = parseInt(input.value);
        return;
      }
    });
    //* Send data to database
    try {
      //* Close modal
      closeModal(modal);
      //* Show preloader
      await showChangePreloader(e);
      await fetch(`/api/quiz/start/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataQuiz),
      })
        .then(async (response) => {
          if (response.status !== 200) {
            return response.json().then((error) => {
              showMessage(error.message, error.description);
            });
          }
          return response.text().then(async (data) => {
            //* Load quiz
            const main = document.querySelector("main");
            const mainError = messages.errors.main_not_found;
            if (!main) return showMessage(mainError.message, mainError.description);
            main.innerHTML = data;
            //* Load quiz functions
            return Promise.all([
              import("./quiz.js").then(({ quizFunctions }) => quizFunctions()),
              import("./navbar.js").then(({ navBar }) => navBar()),
            ]);
          });
        })
        .catch((error) => {
          preload();
          showMessage(error.message, error.description);
        });
    } catch (error) {
      preload();
      showMessage(error.message, error.description);
    } finally {
      await preload();
    }
  });
};

/**
 * Polubienie quizu z poziomu karty.
 *
 * @async
 * @function cardLike
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {HTMLElement} like - Element przycisku polubienia.
 * @property {string} id - ID quizu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {string} data - Dane z odpowiedzi w formie tekstu.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po polubieniu quizu.
 */
//! Like quiz via card
const cardLike = async (like) => {
  if (!like) return;
  //* Get id
  const id = like.dataset.id;
  //* Save to database
  await fetch(`/api/card/like/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.text().then((data) => {
        //* Change like status
        like.classList.toggle("liked");
        return Promise.resolve(data);
      });
    })
    .catch((error) => showMessage(error.message, error.description));
  return Promise.resolve();
};

/**
 * Wybiera losowy kolor.
 *
 * @function randomColor
 * @param {number} [min=125] - Minimalna wartość koloru.
 * @returns {string} Losowy kolor w formacie RGB.
 */
//! Pick random color
const randomColor = (min = 125) => {
  const randomValue = () => Math.floor(Math.random() * (256 - min) + min);
  return `rgb(${randomValue()}, ${randomValue()}, ${randomValue()})`;
};

/**
 * Generuje losowy czas dla animacji.
 *
 * @function randomTime
 * @param {number} [min=10] - Minimalny czas animacji.
 * @returns {number} Losowy czas animacji.
 */
//! Generate random time for animation
const randomTime = (min = 10) => {
  return Math.floor(Math.random() * 10 + 1 + min);
};

/**
 * Zmienia kolor tła kart na stronie głównej.
 *
 * @async
 * @function cardGradient
 * @see {@link randomColor} - Funkcja generująca losowy kolor.
 * @see {@link randomTime} - Funkcja generująca losowy czas animacji.
 * @param {HTMLElement} cards - Element zawierający karty.
 * @property {NodeList} target - Lista elementów kart.
 * @property {boolean} tooLong - Czy jest za dużo kart (Limit animowanych kart: 20).
 * @property {boolean} darkmode - Tryb ciemny potrzebny do ustawienia jasności koloru.
 * @property {number} light - Wartość koloru jasnego od 0 do 255.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie koloru tła kart.
 */
//! Change card background color
export const cardGradient = async (cards) => {
  const target = cards.querySelectorAll("li");
  if (!target || target.length <= 0) return Promise.resolve();
  //* If there are too many cards, the animation will be disabled
  const tooLong = target.length <= 20;
  target.forEach((element) => {
    //* Light color value from 0 to 255
    const darkmode = JSON.parse(localStorage.getItem("darkmode")) || false;
    const light = darkmode ? 20 : 150;
    //* Set background
    element.style.background = `linear-gradient(-45deg, ${randomColor(light)}, ${randomColor(
      light
    )}, ${randomColor(light)})`;
    element.style.backgroundSize = "200%";
    tooLong
      ? (element.style.animation = `gradient ${randomTime()}s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite`)
      : null;
  });
  return Promise.resolve();
};
