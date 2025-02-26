import { messages, showMessage } from "./messages.js";
import { getSVG } from "./svg.js";
import { createElement } from "./element.js";
import { createTable } from "./table.js";
import { createModal, closeModal } from "./modal.js";
import { seeQuestions } from "./question.js";
import { changeActiveItem } from "./navbar.js";
import { preload, showChangePreloader } from "./preloader.js";

/**
 * Uruchamia funkcje związane z quizami.
 *
 * @async
 * @function quizFunctions
 * @see {@link showImage} - Funkcja pokazująca obraz w oknie modalnym.
 * @see {@link textareaMaxLength} - Funkcja pokazująca limit znaków w polu tekstowym.
 * @see {@link reportQuestion} - Funkcja zgłaszająca pytanie.
 * @see {@link explainQuestion} - Funkcja wyjaśniająca pytanie.
 * @see {@link checkAnswers} - Funkcja sprawdzająca odpowiedzi.
 * @see {@link timer} - Funkcja uruchamiająca licznik czasu.
 * @see {@link submitQuiz} - Funkcja wysyłająca quiz.
 * @see {@link changeActiveItem} - Funkcja zmieniająca aktywny element nawigacji.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wykonaniu wszystkich funkcji.
 */
//! Functions for quizzes
export const quizFunctions = async () => {
  return Promise.all([
    showImage(),
    textareaMaxLength(),
    reportQuestion(),
    explainQuestion(),
    checkAnswers(),
    timer(),
    submitQuiz(),
    //* Disable navigation while quiz is active
    changeActiveItem("/api/quiz"),
  ]);
};

/**
 * Wysyła quiz na serwer w celu zapisania go.
 *
 * @async
 * @function submitQuiz
 * @see {@link checkLeftAnswers} - Funkcja sprawdzająca, czy wszystkie odpowiedzi zostały udzielone.
 * @see {@link saveQuiz} - Funkcja zapisująca quiz.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @property {boolean} autosave - Czy autosave jest włączony.
 * @property {HTMLElement} submit - Przycisk wysyłania quizu.
 * @property {HTMLElement} newSubmit - Sklonowany przycisk wysyłania quizu.
 * @property {NodeList} answers - Lista udzielonych odpowiedzi.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wysłaniu quizu.
 * @property {error} submitError - Komunikat o błędzie, jeśli przycisk wysyłania quizu nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Submit quiz
const submitQuiz = async () => {
  //* Check if autosave is enabled
  const autosave = document.querySelector(".quiz").dataset.autosave === "true";
  if (autosave === true) return Promise.resolve();
  //* Check if submit button exists
  const submit = document.querySelector(".quiz-submit");
  const submitError = messages.errors.quiz_submit_not_found;
  if (!submit) return showMessage(submitError.message, submitError.description);
  //* Add event listener to submit button
  const newSubmit = submit.cloneNode(true);
  submit.replaceWith(newSubmit);
  newSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Check if all answers are answered
    const answers = await checkLeftAnswers(autosave);
    if (!answers) return Promise.resolve();
    await saveQuiz(answers);
  });
};

/**
 * Sprawdza, czy wszystkie odpowiedzi zostały udzielone.
 *
 * @async
 * @function checkLeftAnswers
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @param {boolean} [autosave=false] - Czy autosave jest włączony.
 * @property {NodeList} answers - Lista udzielonych odpowiedzi.
 * @property {boolean} answersLeft - Czy wszystkie odpowiedzi zostały udzielone.
 * @returns {Promise<NodeList|void>} Obietnica, która rozwiązuje się z listą odpowiedzi lub pusta.
 * @property {error} answersError - Komunikat o błędzie, jeśli odpowiedzi nie zostaną znalezione.
 * @property {error} answersLeftError - Komunikat o błędzie, jeśli nie wszystkie odpowiedzi zostały udzielone.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Check left answers
const checkLeftAnswers = async (autosave = false) => {
  //* Get all answers
  const answers = document.querySelectorAll(".answers");
  const answersError = messages.errors.quiz_answers_not_found;
  if (!answers || answers.length <= 0)
    return showMessage(answersError.message, answersError.description);
  //* Check if all answers are answered
  const answersLeft = Array.from(answers).every((item) => parseInt(item.dataset.left) === 0);
  const answersLeftError = messages.errors.quiz_answers_left;
  //* Show error message if not all answers are answered
  if (!answersLeft) {
    //* Show message if autosave is disabled
    if (!autosave) return showMessage(answersLeftError.message, answersLeftError.description);
    return Promise.resolve();
  }
  return Promise.resolve(answers);
};

/**
 * Pobiera dane quizu z odpowiedzi udzielonych przez użytkownika i zwraca je w postaci obiektu.
 *
 * @async
 * @function getQuizData
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @param {NodeList} answers - Lista odpowiedzi.
 * @property {Object[]} questions - Lista pytań.
 * @property {HTMLElement[]} inputs - Lista inputów.
 * @property {Object} question - Pytanie.
 * @property {string} question.question_id - Identyfikator pytania.
 * @property {Object[]} question.answer_ids - Lista udzielonych przez użytkownika odpowiedzi.
 * @property {Object} question.checked - Czy pytanie zostało sprawdzone (jeśli pytanie jest otwarte).
 * @property {Object} answer - Odpowiedź.
 * @property {string} answer.answer_id - Identyfikator odpowiedzi.
 * @property {boolean} answer.is_correct - Czy odpowiedź jest poprawna.
 * @property {boolean} answer.user_correct - Czy użytkownik udzielił tej odpowiedzi.
 * @property {string} answer.user_text - Tekst wprowadzony przez użytkownika (jeśli pytanie jest otwarte).
 * @returns {Promise<Object[]>} Obietnica, która rozwiązuje się z danymi quizu.
 * @property {error} answersError - Komunikat o błędzie, jeśli odpowiedzi nie zostaną znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Get quiz data from answers
const getQuizData = async (answers) => {
  //* Check if answers exist
  const answersError = messages.errors.quiz_answers_not_found;
  if (!answers || answers.length <= 0)
    return showMessage(answersError.message, answersError.description);
  //* Get data from answers
  const questions = [];
  answers.forEach((item) => {
    //* Get inputs
    const inputs = item.querySelectorAll("input");
    if (!inputs || inputs.length <= 0) return Promise.resolve();
    //* Get question data
    const question = {
      question_id: inputs[0].value.split("_")[0] || null,
      answer_ids: [],
      checked: item.dataset.left === "0",
    };
    //* Get answers
    inputs.forEach((input) => {
      const answer = {
        answer_id: input.dataset.answer,
        is_correct: input.dataset.correct === "true",
        user_correct: input.parentElement.matches(".pending, .correct, .incorrect"),
        user_text: input.value.split("_")[1].includes("textarea-confirm")
          ? input.closest(".answers").querySelector("textarea").value
          : null,
      };
      //* Add answer to question
      question.answer_ids.push(answer);
    });
    if (!question.question_id) return showMessage(answersError.message, answersError.description);
    //* Add question to questions
    questions.push(question);
  });
  return Promise.resolve(questions);
};

/**
 * Zapisuje quiz na serwerze do bazy danych.
 *
 * @async
 * @function saveQuiz
 * @see {@link getQuizData} - Funkcja pobierająca dane quizu.
 * @see {@link timer} - Funkcja uruchamiająca licznik czasu.
 * @see {@link showChangePreloader} - Funkcja pokazująca preloader.
 * @see {@link preload} - Funkcja pokazująca preloader.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @see {@link navBar} - Funkcja uruchamiająca nawigację.
 * @see {@link initScore} - Funkcja uruchamiająca wyniki.
 * @see {@link changeActiveItem} - Funkcja zmieniająca aktywny element nawigacji.
 * @param {NodeList} answers - Lista odpowiedzi.
 * @property {string} quizId - ID quizu.
 * @property {string} scoreTemp - Nieprzetworzony wynik quizu.
 * @property {number} score - Wynik quizu.
 * @property {boolean} livecheck - Czy livecheck jest włączony.
 * @property {string} time - Czas wykonania quizu.
 * @property {Array} timeTemp - Nieprzetworzony czas wykonania quizu.
 * @property {number} timeSeconds - Czas wykonania quizu w sekundach.
 * @property {Object} dataQuiz - Dane quizu.
 * @property {Object} response - Odpowiedź z serwera.
 * @property {HTMLElement} data - Główny element strony pokazujący wyniki.
 * @property {string} scores - Ścieżka do widoku wyników.
 * @property {HTMLElement} main - Główny element strony.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zapisaniu quizu.
 * @property {error} answersError - Komunikat o błędzie, jeśli odpowiedzi nie zostaną znalezione.
 * @property {error} quizIdError - Komunikat o błędzie, jeśli ID quizu nie zostanie znalezione.
 * @property {error} scoreError - Komunikat o błędzie, jeśli wynik quizu nie zostanie znaleziony.
 * @property {error} timeError - Komunikat o błędzie, jeśli czas quizu nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Save quiz
const saveQuiz = async (answers) => {
  //* Check if answers exist
  const answersError = messages.errors.quiz_answers_not_found;
  if (!answers || answers.length <= 0)
    return showMessage(answersError.message, answersError.description);
  //* Get quiz id
  const quizId = document.querySelector(".quiz").dataset.quiz;
  const quizIdError = messages.errors.quiz_id_not_found;
  if (!quizId) return showMessage(quizIdError.message, quizIdError.description);
  //* Get score
  const scoreTemp = document.querySelector(".quiz_stats_score-text").textContent;
  const score = scoreTemp ? parseInt(scoreTemp.split("/")[0].trim()) : 0;
  const scoreError = messages.errors.quiz_score_not_found;
  if (!score && score !== 0) return showMessage(scoreError.message, scoreError.description);
  //* Get livecheck
  const livecheck = document.querySelector(".quiz").dataset.livecheck === "true";
  //* Get time
  const time = document.querySelector(".quiz-stats_timer-text").textContent;
  const timeError = messages.errors.quiz_time_not_found;
  if (!time) return showMessage(timeError.message, timeError.description);
  //* Convert time to seconds
  const timeTemp = time.split(":");
  const timeSeconds =
    parseInt(timeTemp[0]) * 3600 + parseInt(timeTemp[1]) * 60 + parseInt(timeTemp[2]);
  try {
    //* Get data
    const dataQuiz = await getQuizData(answers);
    //* Stop timer
    timer(true);
    showChangePreloader();
    //* Send data to server
    await fetch(`/api/quiz/save/${quizId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: score,
        data: dataQuiz,
        livecheck: livecheck,
        time: timeSeconds,
      }),
    })
      //* Check response
      .then(async (response) => {
        if (response.status === 200) {
          return response.text().then(async (data) => {
            //* Load scores from
            const main = document.querySelector("main");
            if (!main) throw new Error("main_not_found");
            const scores = "/api/scores";
            localStorage.setItem("view", scores);
            main.innerHTML = data;
            await import("./navbar.js").then(({ navBar }) => navBar());
            await import("./score.js").then(({ initScore }) => initScore());
            await preload();
            await changeActiveItem(scores);
          });
        } else {
          //* Show error message
          return response.json().then(async (error) => {
            await preload();
            showMessage(error.message, error.description);
          });
        }
      })
      //* Catch error
      .catch(async (error) => {
        await preload();
        showMessage(error.message, error.description);
      });
  } catch (error) {
    showMessage(error.message, error.description);
  }
};

/**
 * Aktualizuje punkty w quizie.
 *
 * @function updatePoints
 * @param {HTMLElement} points - Element z punktami.
 * @param {Object} data - Dane odpowiedzi.
 * @property {Object} pointsValue - Liczba punktów.
 * @property {number} pointsValue.correct - Liczba poprawnych odpowiedzi.
 * @property {number} pointsValue.all - Łączna liczba odpowiedzi.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się z zaktualizowanymi punktami.
 */
//! Update points
const updatePoints = (points, data) => {
  //* Get points
  const pointsValue = {
    correct: parseInt(points.textContent.split("/")[0]),
    all: parseInt(points.textContent.split("/")[1]),
  };
  //* Update points
  pointsValue.correct = data.correct ? pointsValue.correct + 1 : pointsValue.correct;
  points.textContent = `${pointsValue.correct}/${pointsValue.all}`;
  return Promise.resolve(points);
};

/**
 * Sprawdza odpowiedź w trybie livecheck.
 *
 * @async
 * @function checkAnswer
 * @see {@link updatePoints} - Funkcja aktualizująca punkty.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @param {Object} input - Dane odpowiedzi.
 * @param {HTMLElement} item - Element odpowiedzi.
 * @param {HTMLElement} target - Element docelowy.
 * @property {HTMLElement} score - Element z wynikiem.
 * @property {string} idValue - ID pytania.
 * @property {string} answer - Odpowiedź.
 * @property {number} answersLeft - Pozostała liczba odpowiedzi.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane odpowiedzi.
 * @property {boolean} data.correct - Czy odpowiedź jest poprawna.
 * @property {number} data.left - Pozostała liczba odpowiedzi.
 * @property {HTMLElement} questionPoints - Element z punktami pytania.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po sprawdzeniu odpowiedzi.
 */
//! Check answer in livecheck mode
const checkAnswer = async (input, item, target) => {
  //* Get main points
  const score = document.querySelector(".quiz_stats_score-text");
  if (!score) return Promise.resolve();
  const { idValue, answer, answersLeft } = input;
  //* Check answer
  await fetch(`/api/quiz/check/${idValue}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer: answer, left: answersLeft }),
  })
    //* Check response
    .then(async (response) => {
      if (response.status === 200) {
        return response.json().then(async (data) => {
          //* Add class to parent
          target.parentElement.classList.add(data.correct ? "correct" : "incorrect");
          //* Update answers left
          item.dataset.left = data.left;
          //* Update question points
          const questionPoints = item.parentElement.querySelector(".points");
          if (questionPoints) updatePoints(questionPoints, data);
          //* Update main points
          updatePoints(score, data);
        });
      } else {
        //* Show error message
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
    })
    //* Catch error
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};

/**
 * Pobiera dane z inputu, formatuje je i zwraca obiekt z danymi odpowiedzi.
 *
 * @function getAnswerData
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @param {HTMLInputElement} input - Element input.
 * @param {HTMLElement} item - Element odpowiedzi.
 * @param {boolean} livecheck - Czy livecheck jest włączony.
 * @property {string} value - Wartość inputu.
 * @property {string} openAnswer - Sprawdzenie, czy odpowiedź jest otwarta.
 * @property {string} idValue - Podstawowy identyfikator pytania.
 * @property {string} answer - Odpowiedź z datasetu.
 * @property {number} answersLeft - Liczba pozostałych odpowiedzi w pytaniu.
 * @returns {Promise<Object|void>} Obietnica, która rozwiązuje się z danymi odpowiedzi lub niczym.
 * @property {error} valueError - Komunikat o błędzie, jeśli wartość inputu nie zostanie znaleziona.
 * @property {error} answerError - Komunikat o błędzie, jeśli odpowiedź nie zostanie znaleziona.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Get data from input (check answers)
const getAnswerData = (input, item, livecheck) => {
  //* Check if input is checked
  const value = input.value;
  const valueError = messages.errors.quiz_answer_not_found;
  if (!value) return showMessage(valueError.message, valueError.description);
  //* Check if answer is open (non changeable)
  const openAnswer = value.split("_")[1];
  if (openAnswer.includes("textarea-confirm")) {
    //* Add class to parent
    input.parentElement.classList.add("pending");
    const openAnswers = input.closest(".answers");
    //* Disable textarea
    openAnswers.querySelector("textarea").disabled = true;
    openAnswers.dataset.left = 0;
    return Promise.resolve();
  }
  //* Check if quiz is live check
  if (livecheck === false) {
    //* Check if input is pending (checked)
    if (input.parentElement.classList.contains("pending")) {
      item.dataset.left = parseInt(item.dataset.left) + 1;
      input.parentElement.classList.remove("pending");
    } else {
      const answersLeft = parseInt(item.dataset.left);
      if (!answersLeft || answersLeft <= 0) return;
      item.dataset.left = answersLeft - 1;
      input.parentElement.classList.add("pending");
    }
    return Promise.resolve();
  }
  //* Check if input is correct
  const idValue = value.split("_")[0];
  if (!idValue) return showMessage(valueError.message, valueError.description);
  //* Get answer
  const answer = input.dataset.answer;
  const answerError = messages.errors.quiz_answer_not_found;
  if (!answer) return showMessage(answerError.message, answerError.description);
  //* Answers left
  const answersLeft = parseInt(item.dataset.left);
  if (!answersLeft || answersLeft <= 0) return;
  if (input.parentElement.matches(".pending, .correct, .incorrect")) return Promise.resolve();
  //* Return values
  return Promise.resolve({ idValue, answer, answersLeft });
};

/**
 * Sprawdza odpowiedzi w quizie i zapisuje je, jeśli autosave jest włączony.
 *
 * @async
 * @function checkAnswers
 * @see {@link getAnswerData} - Funkcja pobierająca dane z inputu.
 * @see {@link checkLeftAnswers} - Funkcja sprawdzająca, czy wszystkie odpowiedzi zostały udzielone.
 * @see {@link saveQuiz} - Funkcja zapisująca quiz.
 * @see {@link checkAnswer} - Funkcja sprawdzająca odpowiedź w trybie livecheck.
 * @property {NodeList} answers - Lista odpowiedzi.
 * @property {boolean} livecheck - Czy livecheck jest włączony.
 * @property {boolean} autosave - Czy autosave jest włączony.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po sprawdzeniu odpowiedzi.
 */
//! Check answers in quiz
const checkAnswers = async () => {
  //* Check if answers exist
  const answers = document.querySelectorAll(".answers");
  if (!answers || answers.length <= 0) return Promise.resolve();
  //* Get livecheck and autosave
  const livecheck = document.querySelector(".quiz").dataset.livecheck === "true";
  const autosave = document.querySelector(".quiz").dataset.autosave === "true";
  //* Add event listener to each answer
  answers.forEach((item) => {
    item.addEventListener("click", async (e) => {
      //* Check if input is clicked
      if (e.target.tagName !== "INPUT") return Promise.resolve();
      //* Get data
      const inputData = await getAnswerData(e.target, item, livecheck);
      if (!inputData) {
        //^ Livecheck (false), autosave (false)
        if (!autosave) return Promise.resolve();
        //* Save quiz
        //^ Livecheck (false), autosave (true)
        const answers = await checkLeftAnswers(autosave);
        if (answers) return await saveQuiz(answers);
        return Promise.resolve();
      }
      //^ Livecheck (true), autosave (false)
      //* Check answer
      if (livecheck === true) await checkAnswer(inputData, item, e.target);
      //* Save quiz
      if (!autosave) return Promise.resolve();
      //^ Livecheck (true), autosave (true)
      const answers = await checkLeftAnswers(autosave);
      if (answers) return await saveQuiz(answers);
      return Promise.resolve();
    });
  });
};

/**
 * Uruchamia licznik czasu.
 *
 * @async
 * @function timer
 * @param {boolean} [stop=false] - Czy zatrzymać licznik.
 * @property {HTMLElement} timerElement - Element licznika.
 * @property {number} intervalId - ID interwału.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po uruchomieniu licznika.
 */
//! Timer
let intervalId; //? Global variable for timer
const timer = async (stop = false) => {
  //* Get timer element
  const timerElement = document.querySelector(".quiz-stats_timer-text");
  if (!timerElement) return Promise.resolve();
  //* Stop timer
  if (stop) return clearInterval(intervalId);
  //* Clock function
  const clock = (timerElement) => {
    let time = 0;
    intervalId = setInterval(() => {
      time++;
      //* Format HH:MM:SS
      const hours = Math.floor(time / 3600)
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((time % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (time % 60).toString().padStart(2, "0");
      //* Update element
      timerElement.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
  };
  //* Run clock
  clock(timerElement);
};

/**
 * Wyjaśnia pytanie.
 *
 * @async
 * @function explainQuestion
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @property {NodeList} buttons - Lista przycisków wyjaśniających pytanie.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wyjaśnieniu pytania.
 */
//! Explain question
const explainQuestion = async () => {
  const buttons = document.querySelectorAll(".explanation");
  if (!buttons || buttons.length <= 0) return Promise.resolve();
  buttons.forEach((item) => {
    item.addEventListener("click", async () => {
      await createModal({
        type: "explanation",
        table: "quiz",
        id: item.dataset.id,
        data: {
          explanation: item.dataset.explanation,
        },
      });
    });
  });
  return Promise.resolve();
};

/**
 * Zgłasza pytanie w quizie.
 *
 * @function reportQuestion
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @property {HTMLElement[]} items - Lista elementów zgłaszania pytania.
 * @property {HTMLElement} item - Element zgłaszania pytania.
 * @property {string} question - Treść pytania.
 * @property {string} id - ID pytania.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zgłoszeniu pytania.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Report question
function reportQuestion() {
  const items = document.querySelectorAll(".report");
  if (!items || items.length <= 0) return Promise.resolve();
  items.forEach((item) => {
    item.addEventListener("click", async () => {
      const question = item.dataset.question;
      const id = item.dataset.id;
      const modal = await createModal({
        type: "report",
        table: "quiz",
        id: id,
        data: {
          question: question,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await fetch(`/api/quiz/report/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        return Promise.resolve();
      });
    });
  });
}

/**
 * Pokazuje limit znaków w polu tekstowym w pytaniu otwartym.
 *
 * @async
 * @function textareaMaxLength
 * @property {HTMLElement[]} items - Lista elementów textarea.
 * @property {HTMLElement} item - Element textarea.
 * @property {HTMLElement} textarea - Element textarea.
 * @property {HTMLElement} span - Element span pokazujący limit znaków.
 * @property {number} maxLength - Maksymalna liczba znaków.
 * @property {number} currentLength - Aktualna liczba znaków.
 * @property {number} remainingLength - Pozostała liczba znaków.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pokazaniu limitu znaków.
 */
//! Show limit of characters in textarea
const textareaMaxLength = async () => {
  const items = document.querySelectorAll("textarea");
  if (!items || items.length <= 0) return Promise.resolve();
  items.forEach((item) => {
    item.addEventListener("keyup", () => {
      textAreaFunction(item.parentElement);
    });
  });
  const textAreaFunction = (event) => {
    const textarea = event.querySelector(event.tagName + " textarea");
    const span = event.querySelector(event.tagName + " span");
    const maxLength = textarea.getAttribute("maxlength");
    const currentLength = textarea.value.length;
    const remainingLength = maxLength - currentLength;
    span.textContent = remainingLength + " / " + maxLength;
  };
  return Promise.resolve();
};

/**
 * Pokazuje obraz w oknie modalnym.
 *
 * @async
 * @function showImage
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @property {HTMLElement[]} items - Lista elementów obrazów.
 * @property {HTMLElement} item - Element obrazu.
 * @property {string} item.src - Źródło obrazu.
 * @property {string} item.alt - Tekst alternatywny obrazu.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pokazaniu obrazu.
 */
//! Show image in modal
const showImage = async () => {
  const items = document.querySelectorAll("img");
  if (!items || items.length <= 0) return Promise.resolve();
  items.forEach((item) => {
    item.addEventListener("click", async () => {
      await createModal({
        type: "image",
        table: "quiz",
        id: item.src,
        data: {
          src: item.src,
          alt: item.alt,
        },
      });
    });
  });
  return Promise.resolve();
};

/**
 * Pokazuje schemat informacji na temat dodawania quizu w formie markdown.
 *
 * @function infoQuiz
 * @see {@link createElement} - Funkcja tworząca element.
 * @see {@link getSVG} - Funkcja pobierająca SVG.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @property {HTMLElement} button - Przycisk pokazujący schemat informacji.
 * @property {HTMLElement} newButton - Kopia przycisku pokazującego schemat informacji.
 * @property {HTMLElement} info - Element schematu informacji.
 * @property {HTMLElement} close - Przycisk zamykający schemat informacji.
 * @property {string} closeSVG - SVG zamykający schemat informacji.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po pokazaniu schematu informacji.
 * @property {error} buttonError - Komunikat o błędzie, jeśli przycisk pokazujący schemat informacji nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Info schema for quizzes
const infoQuiz = () => {
  //* Check if button exists
  const button = document.querySelector(".admin-list-items-quiz-table-info");
  const buttonError = messages.errors.quiz_info_button_not_found;
  if (!button) return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to button
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);
  newButton.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Hide body overflow
    document.body.style.overflow = "hidden";
    //* Get SVG
    const closeSVG = getSVG("close");
    //* Create element
    const info = await createElement({
      tag: "div",
      classes: ["info-quiz"],
      children: [
        {
          tag: "h2",
          children: [
            {
              tag: "p",
              content: messages.texts.quiz_info_title,
            },
            {
              tag: "p",
              content: messages.texts.quiz_info_text,
            },
          ],
        },
        {
          tag: "ul",
          attributes: { role: "list" },
          children: [
            {
              tag: "li",
              attributes: { role: "listitem" },
              content: `
              <p># ${messages.texts.quiz_info_1}</p>
              <p>- ${messages.texts.quiz_info_2}</p>
              <p>- ## ${messages.texts.quiz_info_3}</p>
              <p>### ${messages.texts.quiz_info_4}</p>`,
            },
            {
              tag: "li",
              attributes: { role: "listitem" },
              content: `
              <p># ${messages.texts.quiz_info_5}</p>
              <p>\`\`\`</p>
              <p>console.log("${messages.texts.quiz_info_6}")</p>
              <p>\`\`\`</p>
              <p>- ## \`${messages.texts.quiz_info_7}\`</p>
              <p>- \`${messages.texts.quiz_info_8}\`</p>`,
            },
            {
              tag: "li",
              attributes: { role: "listitem" },
              content: `
              <p># ${messages.texts.quiz_info_9}</p>
              <p>\!\[\](link_to_image.jpg)</p>
              <p>- ${messages.texts.quiz_info_10} jpg, png, webp</p>
              <p>- \!\[audio\](link_to_audio.mp3)</p>
              <p>- ${messages.texts.quiz_info_11} .mp3, .wav</p>
              <p>- \!\[video\](link_to_video.mp4)</p>
              <p>- ${messages.texts.quiz_info_12} .mp4, .mov, .avi</p>`,
            },
            {
              tag: "li",
              attributes: { role: "listitem" },
              content: `
              <p># ${messages.texts.quiz_info_13}</p>
              <p>- ## ${messages.texts.quiz_info_14}</p>`,
            },
          ],
        },
        {
          tag: "h2",
          content: "Example of a quiz file",
        },
        {
          tag: "ul",
          attributes: { role: "list" },
          children: [
            {
              tag: "li",
              attributes: { role: "listitem" },
              content: `
              <p># ${messages.texts.quiz_info_file_1}</p>
              <p>- ## ${messages.texts.quiz_info_file_2}</p>
              <p>- ${messages.texts.quiz_info_file_3}</p>
              <p>- ${messages.texts.quiz_info_file_4}</p>
              <p>- ${messages.texts.quiz_info_file_5}</p>
              <p>### ${messages.texts.quiz_info_file_6}</p>
              <br/>
              <p># ${messages.texts.quiz_info_file_7}</p>
              <p>- ## ${messages.texts.quiz_info_file_8}</p>
              <p>- ## ${messages.texts.quiz_info_file_9}</p>
              <p>- ## ${messages.texts.quiz_info_file_10}</p>
              <p>- ${messages.texts.quiz_info_file_11}</p>
              <br/>
              <p># ${messages.texts.quiz_info_file_12}</p>
              <p>\`\`\`</p>
              <p>&lt;h1&gt;${messages.texts.quiz_info_file_13}&lt;/h1&gt;</p>
              <p>\`\`\`</p>
              <p>- ## ${messages.texts.quiz_info_file_14}</p>
              <p>- ${messages.texts.quiz_info_file_15}</p>
              <p>- ${messages.texts.quiz_info_file_16}</p>
              <p>### ${messages.texts.quiz_info_file_17}</p>
              <br/>
              <p># ${messages.texts.quiz_info_file_18}</p>
              <p>- ## \`console.log("Hello, World!");\`</p>
              <p>- \`print("Hello, World!");\`</p>
              <p>- \`System.out.println("Hello, World!");\`</p>
              <p>### ${messages.texts.quiz_info_file_19}</p>
              <br/>
              <p># ${messages.texts.quiz_info_file_20}</p>
              <p>![audio](dog_sample.mp3)</p>
              <p>- ## ![](dog_image.jpg)</p>
              <p>- ![](cat_image.jpg)</p>
              <br/>
              <p># ${messages.texts.quiz_info_file_21}</p>
              <p>- ## ${messages.texts.quiz_info_file_22}</p>`,
            },
          ],
        },
        {
          tag: "button",
          content: closeSVG,
          properties: { type: "button" },
          attributes: { "data-info-close": "", "aria-label": "Close", role: "button" },
        },
      ],
    });
    //* Append element to body
    document.body.appendChild(info);
    //* Close event listener
    const close = info.querySelector("[data-info-close]");
    close.addEventListener("click", (e) => {
      e.preventDefault();
      //* Show body overflow and remove element
      document.body.style.overflow = "auto";
      info.remove();
    });
  });
  return Promise.resolve();
};

/**
 * Pomocnicza funkcja do błędów walidacji dodawnia pliku quizu.
 *
 * @function validError
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @param {Object} message - Komunikat o błędzie.
 * @param {HTMLElement} file - Element input pliku.
 * @param {HTMLElement} label - Element etykiety pliku.
 * @param {HTMLElement} dropOver - Element obszaru przeciągania pliku.
 * @returns {void}
 */
//! Valid error message for add quiz
const validError = (message, file, label, dropOver) => {
  //* Remove file
  file.value = null;
  label.innerHTML = messages.texts.quiz_table_file_drop;
  //* Remove over class
  dropOver.classList.remove("over");
  return showMessage(message.message, message.description);
};

/**
 * Obsługuje wybór pliku przy dodawaniu quizu.
 *
 * @function handleFile
 * @see {@link validError} - Funkcja pokazująca komunikat o błędzie.
 * @param {HTMLElement} fileInput - Element input pliku.
 * @param {HTMLElement} label - Element etykiety pliku.
 * @param {HTMLElement} dropOver - Element obszaru przeciągania pliku.
 * @property {FileList} file - Lista plików.
 * @property {Array[string]} fileTypes - Dozwolone typy plików (txt, md).
 * @property {string} fileType - Typ pliku.
 * @property {number} fileSize - Rozmiar pliku.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po obsłużeniu pliku.
 * @property {Object} fileErrorType - Komunikat o błędzie, jeśli typ pliku nie zostanie znaleziony.
 * @property {Object} fileErrorSize - Komunikat o błędzie, jeśli rozmiar pliku jest zbyt duży.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Function to handle file selection
const handleFile = (fileInput, label, dropOver) => {
  const file = fileInput.files;
  if (file.length <= 0) return Promise.resolve();
  //* Validate file type
  const fileErrorType = messages.errors.quiz_file_type;
  const fileTypes = ["txt", "md"]; //? All file types
  const fileType = file[0].name.split(".").pop();
  if (!fileTypes.includes(fileType)) return validError(fileErrorType, fileInput, label, dropOver);
  //* Validate file size
  const fileErrorSize = messages.errors.quiz_file_size;
  const fileSize = file[0].size / 1024 / 1024;
  if (fileSize > 1.1) return validError(fileErrorSize, fileInput, label, dropOver);
  //* Update label with file name
  label.innerHTML = file[0].name;
  return Promise.resolve();
};

/**
 * Dodaje quiz do bazy danych.
 *
 * @async
 * @function addQuiz
 * @see {@link handleFile} - Funkcja obsługująca wybór pliku.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @see {@link listQuizzes} - Funkcja listująca quizy.
 * @property {HTMLElement} button - Przycisk dodawania quizu.
 * @property {HTMLElement} newButton - Kopia przycisku dodawania quizu.
 * @property {HTMLElement} dropOver - Element obszaru przeciągania pliku.
 * @property {HTMLElement} fileInput - Element input pliku.
 * @property {HTMLElement} label - Element etykiety pliku.
 * @property {HTMLElement[]} elements - Lista elementów formularza dodawania quizu.
 * @property {string} name - Nazwa quizu.
 * @property {string} terms - Semestry w których quiz jest dostępny.
 * @property {string} academy - Akademia do której quiz jest przypisany.
 * @property {FileList} file - Lista plików.
 * @property {FormData} formData - Dane formularza.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu quizu.
 * @property {error} buttonError - Komunikat o błędzie, jeśli przycisk dodawania quizu nie zostanie znaleziony.
 * @property {error} dropOverError - Komunikat o błędzie, jeśli obszar przeciągania pliku nie zostanie znaleziony.
 * @property {error} fileInputError - Komunikat o błędzie, jeśli input pliku nie zostanie znaleziony.
 * @property {error} fileError - Komunikat o błędzie, jeśli plik nie zostanie znaleziony.
 * @property {error} valuesError - Komunikat o błędzie, jeśli wartości formularza są nieprawidłowe.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Add quiz
const addQuiz = async () => {
  //* Check if button exists
  const button = document.querySelector(".admin-list-items-quiz-table-button-add");
  const buttonError = messages.errors.quiz_add_button_not_found;
  if (!button) return showMessage(buttonError.message, buttonError.description);
  //* Check if drop over area exists
  const dropOver = document.querySelector(".file-upload");
  const dropOverError = messages.errors.quiz_drop_over_not_found;
  if (!dropOver) return showMessage(dropOverError.message, dropOverError.description);
  const fileInput = document.getElementById("admin-list-items-quiz-table-file");
  const fileInputError = messages.errors.quiz_add_button_not_found;
  if (!fileInput) return showMessage(fileInputError.message, fileInputError.description);
  //* Add drop over events
  dropOver.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropOver.classList.add("over");
  });
  //* Remove over class
  ["dragleave", "dragend"].forEach((type) => {
    dropOver.addEventListener(type, (e) => {
      dropOver.classList.remove("over");
    });
  });
  //* Add drop event
  dropOver.addEventListener("drop", (e) => {
    e.preventDefault();
    //* Check if file exists
    const fileError = messages.errors.quiz_file_not_found;
    if (!e.dataTransfer.files.length) return showMessage(fileError.message, fileError.description);
    //* Get file and set it to input
    const label = document.getElementById("admin-list-items-quiz-table-file-label");
    fileInput.files = e.dataTransfer.files;
    //* Handle the file (validate and update label)
    handleFile(fileInput, label, dropOver);
    //* Remove over class
    dropOver.classList.remove("over");
  });
  //* Handle file selection via click
  fileInput.addEventListener("change", () => {
    const label = document.getElementById("admin-list-items-quiz-table-file-label");
    handleFile(fileInput, label, dropOver);
  });
  //* Add event listener to button
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);
  newButton.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Get values
    const elements = [
      document.getElementById("admin-list-items-quiz-table-title"),
      document.getElementById("admin-list-items-quiz-table-terms"),
      document.getElementById("admin-list-items-quiz-table-academy"),
      document.getElementById("admin-list-items-quiz-table-file"),
      document.getElementById("admin-list-items-quiz-table-file-label"),
    ];
    const name = elements[0].value;
    const terms = elements[1].value;
    const academy = elements[2].value;
    const file = elements[3].files;
    //* Check values
    const valuesError = messages.errors.quiz_values_required;
    if (!name || !terms || !academy || !file || !file.length)
      return showMessage(valuesError.message, valuesError.description);
    //* Send data to server
    const formData = new FormData();
    formData.append("name", name);
    formData.append("terms", terms);
    formData.append("academy", academy);
    formData.append("file", file[0]);
    await fetch("/api/quiz/add", {
      method: "POST",
      body: formData,
    })
      //* Check response
      .then(async (response) => {
        if (response.status === 201) {
          return response.json().then(async (data) => {
            //* Reset values
            elements.forEach((element) => (element.value = ""));
            elements[2].options.selectedIndex = 0;
            elements[4].innerHTML = messages.texts.quiz_table_file;
            //* Reload list
            await listQuizzes();
            showMessage(data.message, "", "success");
          });
        }
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      })
      .catch((error) => {
        showMessage(error.message, error.description);
      });
  });
};

/**
 * Usuwa quiz z bazy danych.
 *
 * @async
 * @function deleteQuiz
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link listQuizzes} - Funkcja listująca quizy.
 * @property {HTMLElement[]} buttons - Lista przycisków usuwania quizu.
 * @property {HTMLElement} button - Przycisk usuwania quizu.
 * @property {HTMLElement} newButton - Kopia przycisku usuwania quizu.
 * @property {string} id - ID quizu.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po usunięciu quizu.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przycisk usuwania quizu nie zostanie znaleziony.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Delete quiz
const deleteQuiz = async () => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(".admin-list-items-quiz-table [data-button=delete]");
  const buttonsError = messages.errors.quiz_delete_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Delete code
    const deleteQuiz = async (e) => {
      //* Get value
      const id = button.dataset.id;
      //* Open modal
      const modal = await createModal({
        type: "delete",
        table: "quiz",
        id: id,
        texts: {
          delete_text: messages.texts.quiz_delete_text,
        },
      });
      //* Check if elements exist
      const form = modal.querySelector("form");
      const modalError = messages.errors.modal_not_found;
      if (!modal || !form) return showMessage(modalError.message, modalError.description);
      //* Add event listener to form
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await fetch(`/api/quiz/delete/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
          //* Check response
          .then((response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
                await listQuizzes();
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
        return Promise.resolve();
      });
    };
    //* Add event listener to button
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", deleteQuiz);
  });
};

/**
 * Publikuje quiz. Zmienia widoczność quizu w bazie danych.
 *
 * @async
 * @function publicQuiz
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @see {@link getSVG} - Funkcja pobierająca SVG.
 * @property {HTMLElement[]} buttons - Lista przycisków publikowania quizu.
 * @property {HTMLElement} button - Przycisk publikowania quizu.
 * @property {string} id - ID quizu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po opublikowaniu quizu.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przycisk publikowania quizu nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Public quiz
const publicQuiz = async () => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(".admin-list-items-quiz-table [data-button=public]");
  const buttonsError = messages.errors.quiz_modify_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get values
      const id = button.dataset.id;
      const eye = getSVG("eye");
      const eyeClose = getSVG("eyeClose");
      //* Send data to server
      await fetch(`/api/quiz/public/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        //* Check response
        .then(async (response) => {
          if (response.status === 200) {
            return response.json().then(async (data) => {
              //* Change eye icon
              button.innerHTML = data.status === false ? eyeClose : eye;
              showMessage(data.message, "", "success");
            });
          }
          //* Show error message
          return response.json().then((error) => {
            showMessage(error.message, error.description);
          });
        })
        //* Catch error
        .catch((error) => {
          showMessage(error.message, error.description);
        });
    });
  });
};

/**
 * Pobiera dane quizu z bazy danych.
 *
 * @async
 * @function getQuizValue
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @param {string} id - ID quizu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu quizu.
 * @returns {Promise<Object>} Obietnica, która rozwiązuje się z danymi quizu.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Get quiz data
const getQuizValue = async (id) => {
  let data;
  await fetch(`/api/quiz/list/${id}`)
    .then(async (response) => {
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
  return Promise.resolve(data);
};

/**
 * Edytuje quiz w bazie danych.
 *
 * @async
 * @function editQuiz
 * @see {@link createModal} - Funkcja tworząca okno modalne.
 * @see {@link closeModal} - Funkcja zamykająca okno modalne.
 * @see {@link listQuizzes} - Funkcja listująca quizy.
 * @see {@link getQuizValue} - Funkcja pobierająca dane quizu.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @property {HTMLElement[]} buttons - Lista przycisków edytowania quizu.
 * @property {HTMLElement} button - Przycisk edytowania quizu.
 * @property {HTMLElement} newButton - Kopia przycisku edytowania quizu.
 * @property {string} id - ID quizu.
 * @property {Object} quizData - Dane quizu do edycji.
 * @property {HTMLElement} modal - Okno modalne.
 * @property {HTMLElement} form - Formularz okna modalnego.
 * @property {Object} newData - Nowe dane quizu.
 * @property {string} newData.field - Pole do edycji.
 * @property {string} newData.value - Nowa wartość pola.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po edytowaniu quizu.
 * @property {error} buttonsError - Komunikat o błędzie, jeśli przycisk edytowania quizu nie zostanie znaleziony.
 * @property {error} modalError - Komunikat o błędzie, jeśli okno modalne nie zostanie znalezione.
 * @property {error} dataError - Komunikat o błędzie, jeśli dane do edycji nie zostaną znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Edit quiz
const editQuiz = async () => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(".admin-list-items-quiz-table [data-button=edit]");
  const buttonsError = messages.errors.quiz_modify_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    //* Edit quiz name
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get values
      const id = button.dataset.id;
      const quizData = await getQuizValue(id);
      //* Open modal
      const modal = await createModal({
        type: "edit",
        table: "quiz",
        id: id,
        data: {
          type: button.dataset.type,
          data: quizData[button.dataset.field],
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
        const newData = {
          field: button.dataset.field,
          value: form[button.dataset.field].value,
        };
        const dataError = messages.errors.quiz_modify_data_not_found;
        if (!id || !newData.field || !newData.value || newData.value === "")
          return showMessage(dataError.message, dataError.description);
        await fetch(`/api/quiz/edit/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newData),
        })
          //* Check response
          .then(async (response) => {
            if (response.status === 200) {
              //* Close modal and show message
              return response.json().then(async (data) => {
                await listQuizzes();
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
        return Promise.resolve();
      });
    });
  });
};

/**
 * Tworzy listę quizów w tabeli w panelu administratora.
 *
 * @function createQuizList
 * @see {@link createTable} - Funkcja tworząca tabelę.
 * @see {@link addQuiz} - Funkcja dodająca quiz.
 * @see {@link infoQuiz} - Funkcja pokazująca informacje o quizie.
 * @see {@link deleteQuiz} - Funkcja usuwająca quiz.
 * @see {@link editQuiz} - Funkcja edytująca quiz.
 * @see {@link publicQuiz} - Funkcja publikująca quiz.
 * @see {@link getSVG} - Funkcja pobierająca SVG.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @see {@link seeQuestions} - Funkcja pokazująca pytania quizu.
 * @param {Object[]} data - Dane quizów.
 * @param {string} tbody - Selektor elementu tbody tabeli.
 * @property {HTMLElement} target - Element docelowy tabeli.
 * @property {string} deleteSVG - SVG przycisku usuwania.
 * @property {string} eyeSVG - SVG przycisku pokazującego pytania.
 * @property {string} eyeClose - SVG przycisku zamykającego pytania.
 * @property {string} editSVG - SVG przycisku edytowania.
 * @property {Object} createRow - Funkcja tworząca wiersz tabeli.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po stworzeniu listy quizów.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy tabeli nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Create list of quizzes
const createQuizList = (data, tbody) => {
  //* Check if target exists
  const target = document.querySelector(tbody);
  const targetError = messages.errors.quiz_table_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get SVGs
  const deleteSVG = getSVG("delete");
  const eyeSVG = getSVG("eye");
  const eyeClose = getSVG("eyeClose");
  const editSVG = getSVG("edit");
  //* List of all codes
  const createRow = (item) => ({
    tag: "tr",
    attributes: { role: "row" },
    children: [
      //* Name
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-quiz-table",
        },
        dataset: {
          label: `${messages.texts.quiz_table_title}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.name,
                attributes: {
                  "aria-label": item.name,
                },
              },
              {
                tag: "button",
                content: editSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  field: "name",
                  type: "text",
                  button: "edit",
                },
                attributes: {
                  "aria-label": messages.texts.actions_edit,
                  role: "button",
                },
              },
            ],
          },
        ],
      },
      //* Terms
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-quiz-terms-table",
        },
        dataset: {
          label: `${messages.texts.quiz_table_terms}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.term.join(", "),
                attributes: {
                  "aria-label": item.term.join(", "),
                },
              },
              {
                tag: "button",
                content: editSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  field: "term",
                  type: "text",
                  button: "edit",
                },
                attributes: {
                  "aria-label": messages.texts.actions_edit,
                  role: "button",
                },
              },
            ],
          },
        ],
      },
      //* Academy
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-quiz-academy-table",
        },
        dataset: {
          label: `${messages.texts.quiz_table_academy}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: item.academy,
                attributes: {
                  "aria-label": item.academy,
                },
              },
            ],
          },
        ],
      },
      //* File / Question count
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": messages.texts.quiz_table_count,
        },
        dataset: {
          label: `${messages.texts.quiz_table_count}: `,
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "span",
                content: `${item.question_count} ${messages.texts.quiz_table_questions}`,
                attributes: {
                  "aria-label": `${item.question_count} ${messages.texts.quiz_table_questions}`,
                },
              },
              {
                tag: "button",
                content: eyeSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  button: "see",
                },
                attributes: {
                  "aria-label": messages.texts.actions_see,
                  role: "button",
                },
              },
            ],
          },
        ],
      },
      //* Delete button
      {
        tag: "td",
        attributes: {
          role: "cell",
          "aria-labelledby": "col-quiz-actions-table",
        },
        children: [
          {
            tag: "div",
            classes: ["table-td-content"],
            children: [
              {
                tag: "button",
                content: deleteSVG,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  button: "delete",
                },
                attributes: {
                  "aria-label": messages.texts.actions_delete,
                  role: "button",
                },
              },
              {
                tag: "button",
                content: item.public ? eyeSVG : eyeClose,
                properties: {
                  type: "button",
                },
                dataset: {
                  id: item._id,
                  button: "public",
                },
                attributes: {
                  "aria-label": messages.texts.actions_public,
                  role: "button",
                },
              },
            ],
          },
        ],
      },
    ],
  });
  //* Create the table
  createTable({
    data: data || [],
    target: target,
    firstRow: true,
    colNumbers: 5,
    createRow: createRow,
  });
  //* Run functions to delete, modify and add quizzes
  addQuiz();
  infoQuiz();
  if (data.length > 0) {
    deleteQuiz();
    editQuiz();
    publicQuiz();
    seeQuestions(".admin-list-items-quiz-table [data-button=see]");
  }
  return Promise.resolve();
};

/**
 * Listuje quizy z bazy danych.
 *
 * @async
 * @function listQuizzes
 * @see {@link createQuizList} - Funkcja tworząca listę quizów.
 * @see {@link showMessage} - Funkcja pokazująca komunikat.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} data - Dane quizów.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zlistowaniu quizów.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! List quizzes
export const listQuizzes = async () => {
  await fetch("/api/quiz/list")
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.json().then(async (data) => {
        await createQuizList(data, ".admin-list-items-quiz-table tbody");
        return Promise.resolve();
      });
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};
