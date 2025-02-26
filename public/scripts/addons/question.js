import { messages, showMessage } from "./messages.js";
import { getSVG } from "./svg.js";
import { createElement } from "./element.js";

/**
 * Dodaje pytanie do listy pytań w panelu administratora.
 *
 * @async
 * @function addQuestion
 * @see {@link renderReportQuestion} - Funkcja renderująca pytanie.
 * @see {@link addButtons} - Funkcja dodająca przyciski do pytań.
 * @see {@link updateButtons} - Funkcja aktualizująca przyciski pytań.
 * @see {@link deleteButtons} - Funkcja usuwająca przyciski pytań.
 * @param {Object} data - Dane pytania.
 * @property {HTMLElement} list - Element listy pytań.
 * @property {HTMLElement} item - Element pytania.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu pytania do listy.
 */
//! Add question to list
const addQuestion = async (data) => {
  const list = document.querySelector(".questions-body");
  if (!list) return;
  //* Render the question
  const item = await renderReportQuestion(data, false);
  //* Add item to the list
  list.appendChild(item);
  //* Reload buttons
  addButtons();
  updateButtons();
  deleteButtons();
  return Promise.resolve();
};

/**
 * Usuwa pytanie z listy pytań w panelu administratora.
 *
 * @async
 * @function removeQuestion
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {string} id - ID pytania.
 * @property {HTMLElement} question - Element pytania.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po usunięciu pytania z listy.
 * @property {error} questionError - Obiekt z błędem pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Remove the question from the list
const removeQuestion = async (id) => {
  //* Get the question id
  const question = document.querySelector(`.questions-body-item[data-id='${id}']`);
  const questionError = messages.errors.question_not_found;
  if (!question) return showMessage(questionError.message, questionError.description);
  //* Remove the question
  question.remove();
  return Promise.resolve();
};

/**
 * Aktualizuje liczbę pytań quizu w panelu administratora.
 *
 * @async
 * @function updateNumberOfQuestions
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {string} id - ID quizu.
 * @param {number} number - Liczba pytań do dodania lub odjęcia.
 * @property {HTMLElement} button - Przycisk quizu.
 * @property {HTMLElement} span - Element z liczbą pytań.
 * @property {number} currentNumber - Aktualna liczba pytań.
 * @property {string} newText - Nowy tekst z liczbą pytań.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po aktualizacji liczby pytań.
 * @property {error} buttonError - Obiekt z błędem przycisku pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Update number of questions for the quiz
const updateNumberOfQuestions = async (id, number) => {
  //* Get the quiz id
  const button = document.querySelector(
    `.admin-list-items-quiz-table button[data-id='${id}'][data-button='see']`
  );
  const buttonError = messages.errors.question_button_not_found;
  if (!button) return showMessage(buttonError.message, buttonError.description);
  const span = button.parentElement.querySelector("span");
  //* Update the number of questions
  const currentNumber = parseInt(span.innerText);
  const newText = `${currentNumber + number} ${messages.texts.quiz_table_questions}`;
  span.innerText = newText;
  //* Update aria label
  span.setAttribute("aria-label", newText);
  return Promise.resolve();
};

/**
 * Zmienia status zgłoszenia pytania.
 *
 * @async
 * @function changeReportedStatus
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @param {string} id - ID pytania.
 * @param {string} state - Nowy status zgłoszenia.
 * @property {HTMLElement} question - Element pytania.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie statusu zgłoszenia.
 * @property {error} questionError - Obiekt z błędem pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Change reported status for the question
const changeReportedStatus = async (id, state) => {
  //* Get the question id
  const question = document.querySelector(`.questions-body-item[data-id='${id}']`);
  const questionError = messages.errors.question_not_found;
  if (!question) return showMessage(questionError.message, questionError.description);
  if (state == "delete") return question.remove();
  //* Change reported status
  await fetch(`/api/question/decline/${id}`, { method: "PUT" })
    .then(async (response) => {
      if (response.status === 200) {
        //* Success response
        return response.json().then(async (data) => {
          question.remove();
          if (state == "decline") return showMessage(data.message, "", "success");
          return Promise.resolve();
        });
      } else {
        //* Show error message
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};

/**
 * Funkcja dodająca pytania do bazy danych w panelu administratora quizu.
 *
 * @function addButtons
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link updateNumberOfQuestions} - Funkcja aktualizująca liczbę pytań.
 * @see {@link addQuestion} - Funkcja dodająca pytanie do listy.
 * @property {HTMLElement} button - Przycisk dodawania pytania.
 * @property {HTMLElement} newButton - Sklonowany przycisk dodawania pytania.
 * @property {string} id - ID quizu.
 * @property {HTMLElement} question - Element textarea z pytaniem.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu z danymi pytania i wiadomością.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu pytania.
 * @property {error} buttonError - Obiekt z błędem przycisku pytania nie znaleziono.
 * @property {error} questionError - Obiekt z błędem pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Add button for the questions
const addButtons = () => {
  //* Check if button exists
  const button = document.querySelector(".questions-body button[data-button='add']");
  const buttonError = messages.errors.question_add_button_not_found;
  if (!button) return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to button
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);
  newButton.addEventListener("click", async (e) => {
    e.preventDefault();
    //* Get data
    const id = button.dataset.id;
    const question = document.querySelector(`#question-free`);
    const questionError = messages.errors.question_not_found;
    if (!question) return showMessage(questionError.message, questionError.description);
    //* Add question
    await fetch(`/api/question/add/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.value }),
    })
      .then(async (response) => {
        if (response.status === 201) {
          //* Success response
          return response.json().then(async (data) => {
            //* Update number of questions
            await updateNumberOfQuestions(data.id, 1);
            //* Clear the textarea
            question.value = "";
            //* Add the question to the list
            await addQuestion(data.question);
            showMessage(data.message, "", "success");
            return Promise.resolve();
          });
        } else {
          //* Show error message
          return response.json().then((error) => {
            showMessage(error.message, error.description);
            return Promise.resolve();
          });
        }
      })
      .catch((error) => {
        showMessage(error.message, error.description);
      });
  });
};

/**
 * Funkcja aktualizująca pytania w bazie danych w panelu administratora quizu.
 *
 * @function updateButtons
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link changeReportedStatus} - Funkcja zmieniająca status zgłoszenia pytania.
 * @param {boolean} report - Czy raportować pytania.
 * @property {NodeList} buttons - Lista przycisków edytowania pytań.
 * @property {HTMLElement} newButton - Sklonowany przycisk edytowania pytania.
 * @property {string} id - ID pytania.
 * @property {HTMLElement} question - Element textarea z pytaniem.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po aktualizacji przycisków pytań.
 * @property {error} buttonError - Obiekt z błędem przycisku pytania nie znaleziono.
 * @property {error} questionError - Obiekt z błędem pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Update buttons for the questions
const updateButtons = (report) => {
  //* Check if button exists
  const buttons = document.querySelectorAll(".questions-body button[data-button='edit']");
  const buttonError = messages.errors.question_edit_button_not_found;
  if (!buttons || buttons.length === 0)
    return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get data
      const id = button.dataset.id;
      const question = document.querySelector(`#question-${id}`);
      const questionError = messages.errors.question_not_found;
      if (!question) return showMessage(questionError.message, questionError.description);
      //* Update question
      await fetch(`/api/question/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.value }),
      })
        .then(async (response) => {
          if (response.status === 200) {
            //* Success response
            return response.json().then(async (data) => {
              showMessage(data.message, "", "success");
              if (report) await changeReportedStatus(id, "update");
              return Promise.resolve();
            });
          } else {
            //* Show error message
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
 * Funkcja usuwająca pytania z bazy danych w panelu administratora quizu.
 *
 * @function deleteButtons
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link changeReportedStatus} - Funkcja zmieniająca status zgłoszenia pytania.
 * @see {@link updateNumberOfQuestions} - Funkcja aktualizująca liczbę pytań.
 * @see {@link removeQuestion} - Funkcja usuwająca pytanie z listy.
 * @param {boolean} [report=false] - Czy przycisk ma się pojawić w zgłoszeniach.
 * @property {NodeList} buttons - Lista przycisków usuwania pytań.
 * @property {HTMLElement} newButton - Sklonowany przycisk usuwania pytania.
 * @property {string} id - ID pytania.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu z danymi i wiadomością.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po usunięciu pytania.
 * @property {error} buttonError - Obiekt z błędem przycisku pytania nie znaleziono.
 * @property {error} idError - Obiekt z błędem ID pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Delete buttons for the questions
const deleteButtons = (report = false) => {
  //* Check if button exists
  const buttons = document.querySelectorAll(".questions-body button[data-button='delete']");
  const buttonError = messages.errors.question_delete_button_not_found;
  if (!buttons || buttons.length === 0)
    return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get data
      const id = button.dataset.id;
      const idError = messages.errors.question_id_not_found;
      if (!id) return showMessage(idError.message, idError.description);
      //* Delete question
      await fetch(`/api/question/delete/${id}`, { method: "DELETE" })
        .then(async (response) => {
          if (response.status === 200) {
            //* Success response
            return response.json().then(async (data) => {
              if (report) {
                await changeReportedStatus(id, "delete");
              } else {
                await updateNumberOfQuestions(data.id, -1);
                await removeQuestion(id);
              }
              showMessage(data.message, "", "success");
              return Promise.resolve();
            });
          } else {
            //* Show error message
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
 * Funkcja odrzuca pytania w zgłoszeniach w panelu administratora quizu.
 *
 * @function declineButtons
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link changeReportedStatus} - Funkcja zmieniająca status zgłoszenia pytania.
 * @property {NodeList} buttons - Lista przycisków odrzucania pytań.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po odrzuceniu pytania.
 * @property {error} buttonError - Obiekt z błędem przycisku pytania nie znaleziono.
 */
//! Decline buttons for the questions
const declineButtons = () => {
  //* Check if button exists
  const buttons = document.querySelectorAll(".questions-body button[data-button='decline']");
  const buttonError = messages.errors.question_decline_button_not_found;
  if (!buttons || buttons.length === 0)
    return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", async (e) => {
      await changeReportedStatus(button.dataset.id, "decline");
      return Promise.resolve();
    });
  });
};

/**
 * Funkcja potwierdza lub odrzuca pytanie otwarte w zgłoszeniach w panelu administratora quizu.
 *
 * @function openQuestionButtons
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @property {NodeList} buttons - Lista przycisków do pytań otwartych.
 * @property {HTMLElement} newButton - Sklonowany przycisk pytania otwartego.
 * @property {boolean} state - Stan pytania.
 * @property {string} answer_id - ID pytania.
 * @property {HTMLElement} question - Element pytania.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po potwierdzeniu lub odrzuceniu pytania.
 * @property {error} buttonError - Obiekt z błędem przycisku pytania nie znaleziono.
 * @property {error} questionError - Obiekt z błędem pytania nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Correct and incorrect buttons for the questions
const openQuestionButtons = () => {
  //* Check if button exists
  const buttons = document.querySelectorAll(
    ".questions-open button[data-button='correct'], .questions-open button[data-button='incorrect']"
  );
  const buttonError = messages.errors.question_open_button_not_found;
  if (!buttons || buttons.length <= 0)
    return showMessage(buttonError.message, buttonError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);
    newButton.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Get data
      const state = button.dataset.button === "correct";
      const answer_id = button.dataset.id;
      const question_id = button.dataset.question_id;
      if (!answer_id || !question_id)
        return showMessage(buttonError.message, buttonError.description);
      //* Get the question id
      const question = document.querySelector(
        `.questions-open-item[data-id='${answer_id}'][data-question_id='${question_id}']`
      );
      const questionError = messages.errors.question_not_found;
      if (!question) return showMessage(questionError.message, questionError.description);
      try {
        //* Update answer
        await fetch(`/api/question/open/${answer_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state, question_id }),
        })
          .then(async (response) => {
            if (response.status === 200) {
              //* Success response
              return response.json().then(async (data) => {
                question.remove();
                showMessage(data.message, "", "success");
                return Promise.resolve();
              });
            } else {
              //* Show error message
              return response.json().then((error) => {
                showMessage(error.message, error.description);
              });
            }
          })
          .catch((error) => {
            showMessage(error.message, error.description);
          });
      } catch (error) {
        return showMessage(error.message, error.description);
      }
    });
  });
};

/**
 * Formatuje pytanie do markdown.
 *
 * @async
 * @function formatQuestion
 * @param {Object} question - Dane pytania.
 * @property {Function} formatOption - Funkcja formatująca opcje pytania.
 * @property {string} formattedOption - Sformatowane pytanie.
 * @returns {Promise<string>} Obietnica, która rozwiązuje się z sformatowanym pytaniem.
 */
//! Format question to markdown
const formatQuestion = async (question) => {
  //* Get the question
  let formattedOption = `# ${question.question}\n`;
  //* Format options
  const formatOption = (option) => {
    switch (option.type) {
      //* Add code block (question)
      case "code":
      case "code-open":
        return `\`\`\`\n${option.content}\n\`\`\`\n`;
      //* Add code block (answer)
      case "codespan":
        return `\`${option.content}\`\n`;
      //* Add object (image, audio, video)
      case "image":
      case "image-open":
        return `![image](${option.content})\n`;
      case "audio":
      case "audio-open":
        return `![audio](${option.content})\n`;
      case "video":
      case "video-open":
        return `![video](${option.content})\n`;
      default:
        return "";
    }
  };
  //* Format options in the question
  if (question.options?.length > 0) {
    question.options.forEach((option) => {
      if (Object.keys(option).length > 0) formattedOption += formatOption(option);
    });
  }
  //* Format answers
  if (question.answers?.length > 0) {
    question.answers.forEach((answer) => {
      //* Get default answer text
      let answerText = answer.answer;
      //* Format options in the answer
      if (answer.options?.length > 0) {
        answer.options.forEach((option) => {
          if (Object.keys(option).length > 0)
            answerText = formatOption(option).trim() || answerText;
        });
      }
      //* Add correct answer
      if (answer.is_correct) answerText = `## ${answerText}`;
      //* Add answer to the question
      formattedOption += `- ${answerText}\n`;
    });
  }
  //* Add explanation
  if (question.explanation) {
    formattedOption += `### ${question.explanation}`;
  }
  return Promise.resolve(formattedOption.trim());
};

/**
 * Renderuje obiekt do zgłoszonych pytań i panelu administratora, zwraca obiekt pytania.
 *
 * @async
 * @function renderReportQuestion
 * @see {@link formatQuestion} - Funkcja formatująca pytanie do markdown.
 * @param {Object} question - Dane pytania.
 * @param {boolean} report - Czy pytanie jest w widoku zgłoszeń.
 * @property {string} formattedQuestion - Sformatowane pytanie.
 * @property {Object[]} buttons - Przyciski pytania.
 * @property {Object} item - Element pytania.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się z elementem pytania.
 */
//! Render question to report and panel view
export const renderReportQuestion = async (question, report) => {
  //* Format question to markdown
  const formattedQuestion = await formatQuestion(question);
  //* Buttons for the question
  const buttons = [
    {
      tag: "button",
      classes: ["questions-body-item-button"],
      attributes: { "aria-label": messages.texts.actions_update },
      dataset: { id: question._id, button: "edit" },
      content: messages.texts.actions_update,
    },
    {
      tag: "button",
      classes: ["questions-body-item-button"],
      attributes: { "aria-label": messages.texts.actions_delete },
      dataset: { id: question._id, button: "delete" },
      content: messages.texts.actions_delete,
    },
    {
      tag: "button",
      classes: ["questions-body-item-button"],
      attributes: { "aria-label": messages.texts.actions_decline },
      dataset: { id: question._id, button: "decline" },
      content: messages.texts.actions_decline,
    },
  ];
  //* If question isn't report menu then remove the last button
  if (!report) buttons.pop();
  //* Create element
  const item = await createElement({
    tag: "li",
    classes: ["questions-body-item"],
    attributes: { role: "listitem" },
    dataset: { id: question._id },
    children: [
      {
        tag: "textarea",
        classes: ["questions-body-item-question"],
        id: `question-${question._id}`,
        content: formattedQuestion,
      },
      {
        tag: "div",
        classes: ["questions-body-item-buttons"],
        children: buttons,
      },
    ],
  });
  return Promise.resolve(item);
};

/**
 * Dodaje element zgłoszonych pytań do HTML.
 *
 * @async
 * @function listElements
 * @see {@link renderReportQuestion} - Funkcja renderująca pytanie.
 * @see {@link addButtons} - Funkcja dodająca przyciski do pytań.
 * @see {@link updateButtons} - Funkcja aktualizująca przyciski pytań.
 * @see {@link deleteButtons} - Funkcja usuwająca przyciski pytań.
 * @see {@link declineButtons} - Funkcja odrzucająca pytania.
 * @see {@link openPanel} - Funkcja otwierająca panel pytania.
 * @see {@link createElement} - Funkcja tworząca element.
 * @see {@link getSVG} - Funkcja zwracająca SVG.
 * @param {Object} data - Dane pytań.
 * @param {boolean} report - Czy pytania są w widoku zgłoszeń.
 * @property {string} quiz_name - Nazwa quizu.
 * @property {HTMLElement} closeSVG - Kod SVG ikony zamknięcia.
 * @property {Object[]} questions - Obiekty pytań.
 * @property {HTMLElement} element - Element listy pytań.
 * @property {HTMLElement} reportForm - Formularz zgłoszenia.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu elementów do HTML.
 */
//! Add element to html
const listElements = async (data, report) => {
  //* Load data
  let quiz_name;
  if (data.questions) {
    quiz_name = data.quiz[0].name;
    data = data.questions;
  }
  //* Get SVG
  const closeSVG = getSVG("close");
  //* Format questions
  const questions = await Promise.all(
    data.map(async (question) => await renderReportQuestion(question, report))
  );
  let element;
  //* Add form if report is false
  if (!report) {
    const reportForm = await createElement({
      tag: "li",
      classes: ["questions-body-item"],
      attributes: { role: "listitem" },
      dataset: { id: data[0].quiz_id },
      children: [
        {
          tag: "textarea",
          classes: ["questions-body-item-question"],
          id: `question-free`,
          content: "",
        },
        {
          tag: "div",
          classes: ["questions-body-item-buttons"],
          children: [
            {
              tag: "button",
              classes: ["questions-body-item-button"],
              attributes: {
                "aria-label": messages.texts.actions_add_question,
              },
              dataset: { button: "add", id: data[0].quiz_id },
              content: messages.texts.actions_add_question,
            },
          ],
        },
      ],
    });
    questions.unshift(reportForm);
    //* Create list
    element = await createElement({
      tag: "div",
      classes: ["questions"],
      children: [
        {
          tag: "div",
          classes: ["questions-header"],
          children: [
            {
              tag: "button",
              classes: ["questions-header-close"],
              content: closeSVG,
            },
            {
              tag: "h2",
              classes: ["questions-header-title"],
              content: quiz_name,
            },
          ],
        },
        {
          tag: "ul",
          classes: ["questions-body"],
          attributes: { role: "list" },
          content: questions.map((question) => question.outerHTML).join(""),
        },
      ],
    });
    //* Append element to body
    document.body.appendChild(element);
  } else {
    //* Create report list
    element = document.querySelector(".questions-body");
    questions.forEach((question) => element.appendChild(question));
  }
  //* Auto height textarea
  element.querySelectorAll("textarea").forEach((textarea) => {
    textarea.style.height = "1px";
    textarea.style.height = 25 + textarea.scrollHeight + "px";
  });
  //* Add buttons
  if (!questions.length > 0) return Promise.resolve();
  if (!report) {
    //* Disable scrolling on the body
    document.body.style.overflow = "hidden";
    openPanel(element);
    addButtons();
  }
  updateButtons(report);
  deleteButtons(report);
  if (report) declineButtons();
  return Promise.resolve();
};

/**
 * Otwiera boczny panel z pytaniami w panelu administratora.
 *
 * @async
 * @function openPanel
 * @see {@link closeElement} - Funkcja zamykająca panel pytań.
 * @param {HTMLElement} element - Element panelu pytań.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po otwarciu panelu pytań.
 */
//! Open the question panel
const openPanel = async (element) => {
  //* Add active to the element
  setTimeout(() => {
    element.classList.add("active");
    closeElement(element);
  }, 100);
  return Promise.resolve();
};

/**
 * Dodaje otwarte pytania do HTML.
 *
 * @async
 * @function listOpenElements
 * @see {@link renderOpenQuestion} - Funkcja renderująca pytanie otwarte.
 * @see {@link openQuestionButtons} - Funkcja dodająca przyciski do pytań otwartych.
 * @param {Object[]} data - Dane pytań.
 * @property {Object[]} questions - Obiekty pytań.
 * @property {HTMLElement} element - Element listy pytań.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu otwartych pytań do HTML.
 */
//! Add open questions to html
const listOpenElements = async (data) => {
  //* Format questions
  const questions = await Promise.all(
    data.map(async (question) => await renderOpenQuestion(question, false))
  );
  let element;
  //* Create report list
  element = document.querySelector(".questions-open");
  questions.forEach((question) => element.appendChild(question));
  //* Auto height textarea
  element.querySelectorAll("textarea").forEach((textarea) => {
    textarea.style.height = "1px";
    textarea.style.height = 25 + textarea.scrollHeight + "px";
  });
  //* Add buttons
  if (!questions.length > 0) return Promise.resolve();
  return Promise.resolve(openQuestionButtons());
};

/**
 * Renderuje otwarte pytanie do widoku zgłoszeń.
 *
 * @async
 * @function renderOpenQuestion
 * @see {@link formatQuestion} - Funkcja formatująca pytanie do markdown.
 * @see {@link createElement} - Funkcja tworząca element.
 * @param {Object} question - Dane pytania.
 * @property {string} formattedQuestion - Sformatowane pytanie.
 * @property {Object[]} buttons - Przyciski pytania.
 * @property {HTMLElement} item - Element pytania.
 * @returns {Promise<HTMLElement>} Obietnica, która rozwiązuje się z elementem otwartego pytania.
 */
//! Render open question to report view
const renderOpenQuestion = async (question) => {
  //* Format question to markdown
  const formattedQuestion = await formatQuestion(question);
  //* Buttons for the question
  const buttons = [
    {
      tag: "button",
      classes: ["questions-open-item-button"],
      attributes: { "aria-label": messages.texts.actions_correct },
      dataset: { id: question.answer_db, question_id: question._id, button: "correct" },
      content: messages.texts.actions_correct,
    },
    {
      tag: "button",
      classes: ["questions-open-item-button"],
      attributes: { "aria-label": messages.texts.actions_incorrect },
      dataset: { id: question.answer_db, question_id: question._id, button: "incorrect" },
      content: messages.texts.actions_incorrect,
    },
  ];
  //* Create element
  const item = await createElement({
    tag: "li",
    classes: ["questions-open-item"],
    attributes: { role: "listitem" },
    dataset: { id: question.answer_db, question_id: question._id },
    children: [
      {
        tag: "h4",
        classes: ["questions-open-item-title"],
        content: `${question.quiz_name} - ${question.user_email}`,
      },
      {
        tag: "textarea",
        classes: ["questions-open-item-question"],
        id: `question-${question._id}`,
        content: formattedQuestion,
      },
      {
        tag: "div",
        classes: ["questions-open-item-buttons"],
        children: buttons,
      },
    ],
  });
  return Promise.resolve(item);
};

/**
 * Zamyka boczny panel z pytaniami w panelu administratora.
 *
 * @async
 * @function closeElement
 * @param {HTMLElement} element - Element do zamknięcia.
 * @property {Function} close - Funkcja zamykająca element.
 * @property {HTMLElement} button - Przycisk zamykania.
 * @property {HTMLElement} newButton - Sklonowany przycisk zamykania.
 * @property {Function} handleOutsideClick - Funkcja zamykająca element po kliknięciu na zewnątrz.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zamknięciu elementu.
 */
//! Close element
const closeElement = async (element) => {
  //* Close function
  const close = async () => {
    element.classList.remove("active");
    document.body.style.overflow = "auto";
    setTimeout(() => element.remove(), 210); //? 200ms is the transition time
  };
  //* Get close button
  const button = element.querySelector(".questions-header-close");
  if (!button) return close();
  //* Close on outside click
  const handleOutsideClick = (e) => {
    if (!element.contains(e.target) && !e.target.closest(".questions")) {
      close();
      document.removeEventListener("click", handleOutsideClick);
    }
  };
  document.addEventListener("click", handleOutsideClick);
  //* Add event listener to the button
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);
  newButton.addEventListener("click", async (e) => {
    e.preventDefault();
    close();
    document.removeEventListener("click", handleOutsideClick);
  });
};

/**
 * Ładuje zgłoszone pytania z bazy danych.
 *
 * @async
 * @function loadQuestions
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link noQuestions} - Funkcja dodająca komunikat o braku pytań.
 * @see {@link listElements} - Funkcja dodająca pytania do HTML.
 * @param {boolean} [report=false] - Czy pytania są w widoku raportu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} questions - Obiekty pytań.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po załadowaniu pytań.
 * @property {error} questionsError - Obiekt z błędem zgłoszeń nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Load questions for the quiz
export const loadQuestions = async (report = false) => {
  await fetch(`/api/question/reported`)
    .then((response) => response.json())
    .then(async (questions) => {
      //* Check if data exists
      const questionsError = messages.errors.reports_not_found;
      if (!questions || questions.length <= 0 || questions.status === 500)
        return noQuestions(questionsError.message, ".questions-body");
      await listElements(questions, report);
      return Promise.resolve();
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};

/**
 * Ładuje otwarte pytania z bazy danych.
 *
 * @async
 * @function loadOpenQuestions
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link noQuestions} - Funkcja dodająca komunikat o braku pytań.
 * @see {@link listOpenElements} - Funkcja dodająca pytania do HTML.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} questions - Obiekty pytań.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po załadowaniu otwartych pytań.
 * @property {error} questionsError - Obiekt z błędem pytań nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Load open questions for the quiz
export const loadOpenQuestions = async () => {
  await fetch(`/api/question/open`)
    .then((response) => response.json())
    .then(async (questions) => {
      //* Check if data exists
      const questionsError = messages.errors.no_open_questions;
      if (!questions || questions.length <= 0)
        return noQuestions(questionsError.message, ".questions-open");
      await listOpenElements(questions);
      return Promise.resolve();
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};

/**
 * Dodaje komunikat o braku pytań.
 *
 * @function noQuestions
 * @param {string} message - Komunikat o braku pytań.
 * @param {string} object - Selektor elementu docelowego.
 * @property {HTMLElement} target - Element docelowy.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po dodaniu komunikatu.
 */
//! Add no open questions message
const noQuestions = (message, object) => {
  const target = document.querySelector(object);
  if (target) target.innerHTML = `<h3>${message}</h3>`;
  return Promise.resolve();
};

/**
 * Wyświetla pytanie w panelu administratora quizu.
 *
 * @function seeQuestions
 * @see {@link showMessage} - Funkcja wyświetlająca komunikat.
 * @see {@link listElements} - Funkcja dodająca pytania do HTML.
 * @param {string} target - Selektor przycisków wyświetlania pytań.
 * @param {boolean} [report=false] - Czy pytania są w widoku raportu.
 * @property {NodeList} buttons - Lista przycisków wyświetlania pytań.
 * @property {string} id - ID quizu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu z danymi pytań i quizu.
 * @property {Object[]} questions - Obiekty pytań.
 * @property {Object} quiz - Obiekt quizu.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po wyświetleniu pytań.
 * @property {error} buttonsError - Obiekt z błędem przycisku pytania nie znaleziono.
 * @property {error} questionsError - Obiekt z błędem pytań nie znaleziono.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! See questions for the quiz
export const seeQuestions = (target, report = false) => {
  //* Check if buttons exist
  const buttons = document.querySelectorAll(target);
  const buttonsError = messages.errors.question_button_not_found;
  if (!buttons) return showMessage(buttonsError.message, buttonsError.description);
  //* Add event listener to each button
  buttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Check if questions already exist
      if (document.querySelector(".questions")) return Promise.resolve();
      const id = button.dataset.id;
      //* Load questions
      await fetch(`/api/question/list/${id}`)
        .then((response) => response.json())
        .then(async (data) => {
          //* Check if data exists
          const questions = data?.questions;
          const quiz = data?.quiz;
          const questionsError = messages.errors.questions_not_found;
          if (!questions || !quiz)
            return showMessage(questionsError.message, questionsError.description);
          await listElements({ questions, quiz }, report);
          return Promise.resolve();
        })
        .catch((error) => {
          showMessage(error.message, error.description);
        });
    });
  });
};
