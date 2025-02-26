import { showMessage, messages } from "./messages.js";
import { getSVG } from "./svg.js";
import { createElement } from "./element.js";
import { cardGradient, cardFunctions } from "./card.js";

/**
 * Inicjalizuje główną stronę, ładując karty i ustawiając filtry.
 *
 * @async
 * @function initMain
 * @see {@link changeActiveFilter} - Funkcja zmieniająca aktywny filtr i wyświetlanie.
 * @see {@link cardLoad} - Funkcja ładująca karty.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {HTMLElement} target - Element listy kart.
 * @property {HTMLElement} filters - Element filtrów.
 * @property {HTMLElement} academySelect - Element wyboru akademii.
 * @property {string} academyId - ID wybranej akademii.
 * @property {string} filter - Aktywny filtr.
 * @property {string} display - Aktualne wyświetlanie kart.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po inicjalizacji strony głównej.
 * @property {error} targetError - Komunikat o błędzie, jeśli element listy kart nie zostanie znaleziony.
 * @property {error} filtersError - Komunikat o błędzie, jeśli element filtrów nie zostanie znaleziony.
 * @property {error} academySelectError - Komunikat o błędzie, jeśli element wyboru akademii nie zostanie znaleziony.
 * @property {error} academyIdError - Komunikat o błędzie, jeśli ID akademii nie zostanie znalezione.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Card initialization
export const initMain = async () => {
  //* Check if elements exist
  const target = document.querySelector(".list");
  //* Error message
  const targetError = messages.errors.list_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get filters and sort
  const filters = document.querySelector(".filters");
  //* Error message
  const filtersError = messages.errors.filters_not_found;
  if (!filters) return showMessage(filtersError.message, filtersError.description);
  //* Get academy select
  let academySelect = document.getElementById("filters-academy-select");
  //* Error message
  const academySelectError = messages.errors.academy_select_not_found;
  if (!academySelect)
    return showMessage(academySelectError.message, academySelectError.description);
  //* Get selected academy
  const academyId = JSON.parse(localStorage.getItem("academy_id") || "");
  const academyIdError = messages.errors.academy_id_missing;
  if (!academyId) return showMessage(academyIdError.message, academyIdError.description);
  //* Load active filter
  await changeActiveFilter(filters, academySelect);
  //* Get active filter and display
  let display = "grid";
  let filter = "recent";
  const activeFilter = filters.querySelectorAll(".active");
  activeFilter.forEach((item) => {
    item.classList.contains("display") ? (display = item.dataset.id) : (filter = item.dataset.id);
  });
  //* Load cards
  return Promise.all([cardLoad(target, academyId, filter, display)]);
};

/**
 * Obsługuje zmianę wyboru akademii.
 *
 * @async
 * @function academySelectChange
 * @see {@link cardLoad} - Funkcja ładująca karty.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @param {HTMLElement} academy - Element wyboru akademii.
 * @property {string} academy_id - ID wybranej akademii.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie tekstu.
 * @returns {Promise<Array>} Obietnica, która rozwiązuje się po zmianie wyboru akademii.
 * @property {error} targetError - Komunikat o błędzie, jeśli element listy kart nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Academy select change
const academySelectChange = async (academy) => {
  if (!academy) return Promise.resolve();
  //* Event listener for academy change
  academy.addEventListener("change", async (e) => {
    e.preventDefault();
    //* Set academy id
    const academy_id = e.target.value;
    //* Save to local storage
    localStorage.setItem("academy_id", JSON.stringify(academy_id));
    //* Save to database
    await fetch("/api/account/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "academy_id", value: academy_id }),
    })
      .then(async (response) => {
        if (response.status !== 200) {
          return response.json().then((error) => {
            showMessage(error.message, error.description);
          });
        }
        return response.text().then((data) => {
          //* Reload cards
          return Promise.all([cardLoad()]);
        });
      })
      .catch((error) => {
        showMessage(error.message, error.description);
      });
  });
  return Promise.resolve();
};

/**
 * Obsługuje zmianę filtra i sortowania kart.
 *
 * @async
 * @function filterChange
 * @see {@link cardLoad} - Funkcja ładująca karty.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @param {NodeList} items - Lista elementów filtrów.
 * @param {HTMLElement} target - Element docelowy filtrów.
 * @property {HTMLElement} item - Element filtrujący.
 * @property {string} id - ID filtra.
 * @property {string} type - Typ filtra (display lub sort).
 * @property {NodeList} typeItems - Lista elementów danego typu.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie tekstu.
 * @returns {Promise<Array>} Obietnica, która rozwiązuje się po zmianie filtra.
 * @property {error} idError - Komunikat o błędzie, jeśli brakuje ID filtra.
 * @property {error} typeError - Komunikat o błędzie, jeśli brakuje typu filtra.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Filter change
const filterChange = async (items, target) => {
  //* Event listener for filter change
  items.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      //* Prevent active status
      if (["active", "select"].some((cls) => item.classList.contains(cls))) return;
      //* Get filter id
      const id = item.dataset.id;
      const idError = messages.errors.filter_id_missing;
      if (!id) return showMessage(idError.message, idError.description);
      //* Get display or sort
      const type = item.classList.contains("display") ? "display" : "sort";
      const typeError = messages.errors.filter_type_missing;
      if (!type) return showMessage(typeError.message, typeError.description);
      //* Remove active status
      const typeItems = target.querySelectorAll(`.${type}`);
      typeItems.forEach((el) => el.classList.remove("active"));
      //* Add active status
      item.classList.add("active");
      //* Save to local storage
      localStorage.setItem(type, JSON.stringify(id));
      //* Save to database
      await fetch("/api/account/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type, value: id }),
      })
        .then(async (response) => {
          if (response.status !== 200) {
            return response.json().then((error) => {
              showMessage(error.message, error.description);
            });
          }
          return response.text().then((data) => {
            return Promise.all([cardLoad()]);
          });
        })
        .catch((error) => {
          showMessage(error.message, error.description);
        });
    });
  });
  return Promise.resolve();
};

/**
 * Zmienia aktywny filtr i wyświetlanie kart.
 *
 * @async
 * @function changeActiveFilter
 * @see {@link academySelectChange} - Funkcja obsługująca zmianę wyboru akademii.
 * @see {@link filterChange} - Funkcja obsługująca zmianę filtra.
 * @param {HTMLElement} target - Element docelowy filtrów.
 * @param {HTMLElement} academy - Element wyboru akademii.
 * @property {string} display - Typ wyświetlania (grid lub list).
 * @property {string} sort - Typ sortowania (recent, asc, desc, like).
 * @property {string} academy_id - ID wybranej akademii.
 * @property {NodeList} items - Lista elementów filtrów.
 * @property {NodeList} options - Lista opcji wyboru akademii.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie aktywnego filtra.
 */
//! Change filters active status
const changeActiveFilter = async (target, academy) => {
  //* Get data
  const display = JSON.parse(localStorage.getItem("display")) || "grid";
  const sort = JSON.parse(localStorage.getItem("sort")) || "recent";
  const academy_id = JSON.parse(localStorage.getItem("academy_id") || "");
  const items = target.querySelectorAll("li");
  if (items.length <= 0) return;
  //* Load active filter
  items.forEach((item) => {
    const id = item.dataset.id;
    id == display || id == sort ? item.classList.add("active") : item.classList.remove("active");
  });
  //* Load academy
  const options = academy.querySelectorAll("option");
  if (options.length > 0) {
    options.forEach((option) => {
      const id = option.value;
      if (id == String(academy_id)) option.selected = true;
    });
  }
  //* Event listener for academy change and filter change
  return Promise.all([academySelectChange(academy), filterChange(items, target)]);
};

/**
 * Tworzy listę elementów kart i dodaje je do elementu docelowego HTML.
 *
 * @async
 * @function createCardElements
 * @see {@link getSVG} - Funkcja pobierająca kod SVG.
 * @see {@link createElement} - Funkcja tworząca element DOM.
 * @param {Object} termCards - Obiekt zawierający karty pogrupowane według semestrów.
 * @param {string} display - Typ wyświetlania (grid lub list).
 * @param {HTMLElement} target - Element docelowy kart.
 * @property {string} amountSVG - Kod SVG ikony ilości pytań.
 * @property {string} heartSVG - Kod SVG ikony polubienia.
 * @property {HTMLElement} h2 - Nagłówek terminu.
 * @property {HTMLElement} ul - Lista kart.
 * @property {HTMLElement} li - Element karty.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po utworzeniu elementów kart.
 */
//! Create card elements
const createCardElements = async (termCards, display, target) => {
  //* Clear target
  target.innerHTML = "";
  //* Get SVGs
  const amountSVG = getSVG("amount");
  const heartSVG = getSVG("heart");
  //* Create cards
  for (const cards in termCards) {
    const termNumber = messages.texts[`term_${cards}`];
    const h2 = createElement({
      tag: "h2",
      classes: ["list-term"],
      children: [
        {
          tag: "fieldset",
          classes: ["list-term-fieldset"],
          children: [
            {
              tag: "legend",
              classes: ["list-term-fieldset-legend"],
              content: `${termNumber} ${messages.texts.term}`,
            },
          ],
        },
      ],
    });
    const ul = createElement({
      tag: "ul",
      classes: ["list-items", display],
      attributes: { role: "list" },
    });
    for (const card of termCards[cards]) {
      const liked = card.liked || false;
      const likedClasses = liked
        ? ["list-items-card-content-icons-like", "liked"]
        : ["list-items-card-content-icons-like"];
      const publicCard = card.public ? "public" : "private";
      const li = createElement({
        tag: "li",
        classes: ["list-items-card", publicCard],
        attributes: { role: "listitem", "aria-label": card.name },
        dataset: { id: card._id, term: card.term, title: card.name },
        children: [
          {
            tag: "div",
            classes: ["list-items-card-content"],
            children: [
              {
                tag: "div",
                classes: ["list-items-card-content-icons"],
                children: [
                  {
                    tag: "span",
                    classes: ["list-items-card-content-icons-amount"],
                    content: amountSVG + card.question_count,
                  },
                  {
                    tag: "span",
                    classes: likedClasses,
                    attributes: { "aria-label": "Like" },
                    dataset: { id: card._id },
                    content: heartSVG,
                  },
                ],
              },
              {
                tag: "p",
                classes: ["list-items-card-content-title"],
                content: card.name,
              },
            ],
          },
        ],
      });
      ul.appendChild(li);
    }
    [h2, ul].forEach((el) => target.appendChild(el));
  }
  return Promise.resolve();
};

/**
 * Ładuje karty z bazy danych i przetwarza je.
 *
 * @async
 * @function cardLoad
 * @see {@link createCardElements} - Funkcja tworząca elementy kart.
 * @see {@link cardGradient} - Funkcja ustawiająca gradient kart.
 * @see {@link cardFunctions} - Funkcja obsługująca funkcje kart.
 * @property {HTMLElement} target - Element docelowy kart.
 * @property {string} academyId - ID akademii.
 * @property {string} filter - Typ sortowania (np. rosnący).
 * @property {string} display - Typ wyświetlania (grid lub list).
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object[]} data - Dane kart.
 * @property {Object} termCards - Karty pogrupowane według semestrów.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po załadowaniu kart.
 * @property {error} targetError - Komunikat o błędzie, jeśli element listy kart nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Card load from database
const cardLoad = async () => {
  //* Check if elements exist
  const target = document.querySelector(".list");
  //* Error message
  const targetError = messages.errors.list_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Reload cards filter, display and academy
  const academyId = JSON.parse(localStorage.getItem("academy_id") || "");
  const filter = JSON.parse(localStorage.getItem("sort")) || "recent";
  const display = JSON.parse(localStorage.getItem("display")) || "grid";
  //* Load cards
  await fetch(`/api/card?academy_id=${academyId}`)
    .then(async (response) => {
      if (response.status !== 200) {
        return response.json().then((error) => {
          showMessage(error.message, error.description);
        });
      }
      return response.json().then(async (data) => {
        if (!data || data.length <= 0) return Promise.resolve();
        //* Sort data by filter
        switch (filter) {
          case "desc":
            data.sort((a, b) => b.name.localeCompare(a.name));
            break;
          case "asc":
            data.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case "like":
            data.sort((a, b) => b.liked - a.liked);
            break;
          case "recent":
            data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            break;
          default:
            return;
        }
        //* Create cards sort by term
        const termCards = data.reduce((acc, item) => {
          //* Check if term is an array
          const termsArray = Array.isArray(item.term) ? item.term : [item.term];
          //* Add terms to object
          termsArray.forEach((term) => {
            if (!acc[term]) {
              acc[term] = [];
            }
            acc[term].push(item);
          });
          return acc;
        }, {});
        //* Create card elements
        return Promise.all([
          createCardElements(termCards, display, target),
          cardGradient(target),
          cardFunctions(target),
        ]);
      });
    })
    .catch((error) => {
      showMessage(error.message, error.description);
    });
};
