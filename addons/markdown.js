const { marked } = require("marked");
const { v4: uuidv4 } = require("uuid");

/**
 * Parsuje zawartość quizu w formacie Markdown na obiekt z danymi pytania, odpowiedzi i innych opcji quizu.
 *
 * @function parseMarkdownQuiz
 * @param {string} content - Zawartość quizu do sparsowania w formacie Markdown.
 * @property {string} question - Pytanie quizu.
 * @property {Object} options - Opcje quizu.
 * @property {string} options.type - Typ opcji quizu.
 * @property {string} options.content - Zawartość opcji quizu.
 * @property {Object[]} answers - Tablica odpowiedzi quizu.
 * @property {string} answers.answer_id - Identyfikator odpowiedzi quizu.
 * @property {string} answers.answer - Odpowiedź quizu.
 * @property {Object} answers.options - Opcje odpowiedzi quizu.
 * @property {string} answers.options.type - Typ opcji odpowiedzi quizu.
 * @property {string} answers.options.content - Zawartość opcji odpowiedzi quizu.
 * @property {boolean} answers.is_correct - Flaga informująca, czy odpowiedź jest poprawna.
 * @property {string} explanation - Wyjaśnienie quizu.
 * @property {number} attempts - Liczba prób.
 * @property {boolean} reported - Flaga informująca o zgłoszeniu quizu.
 * @property {Date} created_at - Data utworzenia quizu.
 * @property {Date} updated_at - Data aktualizacji quizu.
 * @throws {Error} Jeśli wystąpi błąd podczas parsowania zawartości quizu.
 * @returns {Object[]} Tablica obiektów zawierających pytania, odpowiedzi i inne opcje quizu.
 */
//! Parse Markdown quiz
function parseMarkdownQuiz(content) {
  const parsedData = [];
  //* Parse the content
  const tokens = marked.lexer(content);
  //* Declare the variables
  let currentQuestion = null;
  let currentAnswers = [];
  let options = {};
  let explanation = "";
  //* Boolean to stop the loop if needed
  let forEachStop = false;
  //* Loop through the tokens
  tokens.forEach((token) => {
    if (forEachStop) return;
    switch (token.type) {
      //* Find the new question (heading 1 - #)
      case "heading":
        //* Find the new question
        if (token.depth === 1) {
          //* Save the previous question if it exists
          if (currentQuestion) saveQuestion();
          //* Set new question
          currentQuestion = token.text;
          currentAnswers = [];
          options = {};
          explanation = "";
        } else if ([2, 4, 5, 6].includes(token.depth)) {
          //* Save the previous question if it exists
          if (currentQuestion) saveQuestion();
          //* Set feedback for the answer (not null)
          setFeedbackQuestionHeading();
        } else if (token.depth === 3) {
          //* Set explanation for the question
          explanation = token.text;
        }
        break;
      //* Find the answers in the list items
      case "list":
        //* Parse list items as potential answers
        token.items.forEach((item) => parseListItem(item));
        break;
      //* Parse media content within paragraphs
      case "paragraph":
        //* Parse media content within paragraphs
        if (token.tokens) options = parseMediaContent(token.tokens);
        break;
      //* Parse code blocks
      case "code":
        //* Add code block to options
        options = { type: "code", content: token.text };
        break;
      //* Default case
      default:
        break;
    }
  });
  //* Save the last question
  if (currentQuestion) saveQuestion();
  //* Function to parse list items
  function parseListItem(item) {
    //* Declare variables
    let isCorrect = false;
    let answerText = "";
    let answerOptions = {};
    item.tokens.forEach((subToken) => {
      //* Identify headings for correct answers (heading 2 - ##)
      if (subToken.type === "heading" && subToken.depth === 2) {
        isCorrect = true;
      }
      answerText = subToken.text || answerText;
      //* Parse tokens within list items
      if (subToken.tokens) {
        subToken.tokens.forEach((codeToken) => {
          if (codeToken.type === "codespan") {
            //* Handle code within answers
            answerOptions = { type: "codespan", content: codeToken.text };
          } else if (codeToken.type === "image") {
            //* Handle media content within answers
            const mediaType = identifyMediaType(codeToken.text);
            answerOptions = { type: mediaType, content: codeToken.href };
            //* Set feedback for the answer (not null)
            answerText = mediaType;
          }
        });
      }
      //* Check for correct headings within list items (heading 2 - ##)
      if (subToken.type === "heading" && [1, 3, 4, 5, 6].includes(subToken.depth)) {
        setFeedbackQuestionHeading();
      }
    });
    //* Save the parsed answer
    currentAnswers.push({
      answer_id: uuidv4(),
      answer: answerText.trim(),
      options: answerOptions,
      is_correct: isCorrect,
    });
  }
  //* Function to parse media content
  function parseMediaContent(tokens) {
    for (const innerToken of tokens) {
      if (innerToken.type === "image") {
        const mediaType = identifyMediaType(innerToken.text);
        const mediaData = { type: mediaType, content: innerToken.href };
        return mediaData;
      } else if (innerToken.type === "text") {
        setFeedbackQuestionHeading();
      }
    }
    return {};
  }
  //* Function to set feedback question heading
  function setFeedbackQuestionHeading() {
    currentQuestion = "H";
    currentAnswers = [];
    options = {};
    explanation = "";
    forEachStop = true;
  }
  //* Helper function to identify media type
  function identifyMediaType(text) {
    if (text.toLowerCase().includes("video")) return "video";
    if (text.toLowerCase().includes("audio")) return "audio";
    return "image";
  }
  //* Function to save question
  function saveQuestion() {
    //* Add open question if single answer
    if (currentAnswers.length <= 1) {
      options.type = [options.type, "open"].filter((type) => type).join("-");
      options.content = options.content || true;
    }
    //* Add question to parsed data
    parsedData.push({
      question: currentQuestion,
      options: options,
      answers: currentAnswers,
      explanation: explanation,
      attempts: 0,
      reported: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  //* Return the parsed data
  return parsedData;
}

/**
 * Waliduje dane pytania quizu.
 *
 * @function validateQuizData
 * @param {Object} quizData - Dane pytania quizu do zwalidowania.
 * @property {error} quiz_question_required - Błąd informujący, że pytanie jest wymagane.
 * @property {error} quiz_question_invalid_format - Błąd informujący, że pytanie ma nieprawidłowy format.
 * @property {error} quiz_question_length - Błąd informujący, że pytanie ma nieprawidłową długość.
 * @property {error} quiz_question_heading - Błąd informujący, że pytanie nie jest nagłówkiem H1.
 * @property {error} quiz_explanation_invalid_format - Błąd informujący, że wyjaśnienie pytania ma nieprawidłowy format.
 * @property {error} quiz_explanation_length - Błąd informujący, że wyjaśnienie pytania ma nieprawidłową długość.
 * @property {error} quiz_answers_invalid_format - Błąd informujący, że odpowiedzi pytania mają nieprawidłowy format.
 * @property {error} quiz_open_options_required - Błąd informujący, że opcje otwartego pytania są wymagane.
 * @property {error} quiz_open_answer_required - Błąd informujący, że odpowiedź otwartego pytania jest wymagana.
 * @property {error} quiz_open_answer_single - Błąd informujący, że odpowiedź otwartego pytania nie jest pojedyncza.
 * @property {error} quiz_open_answer_length - Błąd informujący, że odpowiedź otwartego pytania ma nieprawidłową długość.
 * @property {error} quiz_answers_required - Błąd informujący, że odpowiedzi pytania są wymagane.
 * @property {error} quiz_answer_required - Błąd informujący, że odpowiedź pytania jest wymagana.
 * @property {error} quiz_answer_length - Błąd informujący, że odpowiedź pytania ma nieprawidłową długość.
 * @property {error} quiz_answer_heading - Błąd informujący, że odpowiedź nie jest nagłówkiem H2.
 * @property {error} quiz_duplicate_answers - Błąd informujący, że odpowiedzi pytania są zduplikowane.
 * @property {error} quiz_correct_answer_required - Błąd informujący, że poprawna odpowiedź pytania jest wymagana.
 * @property {error} quiz_options_content_required - Błąd informujący, że opcje pytania są wymagane (np. kod, obraz, wideo, audio).
 * @property {error} quiz_answer_options_content_required - Błąd informujący, że opcje odpowiedzi pytania są wymagane (np. kod, obraz, wideo, audio).
 * @throws {Error} Jeśli wystąpi błąd podczas walidacji danych pytania quizu.
 * @returns {string|null} Kod błędu walidacji lub null, jeśli walidacja zakończyła się sukcesem.
 */
//! Validate quiz question data
const validateQuizData = (quizData) => {
  //* Check if the question is present
  if (!quizData.question) return "quiz_question_required";
  //* Check the question format
  if (typeof quizData.question !== "string") return "quiz_question_invalid_format";
  //* Check the question length
  if (quizData.question.length < 2 || quizData.question.length > 2048) {
    if (quizData.question === "H") return "quiz_question_heading";
    return "quiz_question_length";
  }
  //* Check the explanation
  if (quizData.explanation) {
    //* Check the explanation format
    if (typeof quizData.explanation !== "string") return "quiz_explanation_invalid_format";
    //* Check the explanation length
    if (quizData.explanation.length < 2 || quizData.explanation.length > 4096)
      return "quiz_explanation_length";
  }
  //* Check answers array
  if (!Array.isArray(quizData.answers)) return "quiz_answers_invalid_format";
  //* Check the open question
  if (quizData.options && quizData.options.type && quizData.options.type.includes("open")) {
    //* Check the open question tbc.
    if (quizData.options.content.length <= 0) return "quiz_open_options_required";
    //* Check if the answer is present
    if (quizData.answers.length === 0) return "quiz_open_answer_required";
    //* Check the amount of answers
    if (quizData.answers.length !== 1) return "quiz_open_answer_single";
    //* Check the content of the answer
    if (quizData.answers[0].answer.length < 2 || quizData.answers[0].answer.length > 2048)
      return "quiz_open_answer_length";
  } else {
    //* Check the amount of answers (at least 2)
    if (quizData.answers.length < 2) return "quiz_answers_required";
    for (const answer of quizData.answers) {
      //* Check the content of the answers
      if (!answer.answer) return "quiz_answer_required";
      //* Check the answer length
      if (answer.answer.length < 2 || answer.answer.length > 2048) {
        if (answer.answer === "H") return "quiz_answer_heading";
        return "quiz_answer_length";
      }
      //* Check the options for the answer
      if (answer.options && ["codespan", "image", "video", "audio"].includes(answer.options.type)) {
        //* Check options content validation
        if (!answer.options.content) return "quiz_answer_options_content_required";
      }
    }
    //* Check if the answers are unique
    const uniqueAnswers = new Set(quizData.answers.map((answer) => answer.answer));
    if (uniqueAnswers.size !== quizData.answers.length) return "quiz_duplicate_answers";
    //* Check if the correct answer is present (at least 1)
    const correctAnswers = quizData.answers.filter((answer) => answer.is_correct);
    if (!correctAnswers.length) return "quiz_correct_answer_required";
    //* Check the options
    if (quizData.options && ["code", "image", "video", "audio"].includes(quizData.options.type)) {
      //* Check options content validation
      if (!quizData.options.content) return "quiz_options_content_required";
    }
  }
  //* Return no error
  return null;
};

module.exports = { parseMarkdownQuiz, validateQuizData };
