/**
 * Tworzy element DOM na podstawie opcji.
 *
 * @function createElement
 * @param {string} tag - Nazwa tagu (np. div, p, a).
 * @param {Object} [attributes={}] - Obiekt atrybutów (np. {id: "id", class: "class"}).
 * @param {Object} [properties={}] - Obiekt właściwości (np. {innerText: "text", src: "src"}).
 * @param {Object} [dataset={}] - Obiekt dataset (np. {id: "id", name: "name"}).
 * @param {string[]} [classes=[]] - Tablica klas (np. ["class1", "class2"]).
 * @param {string|null} [id=null] - ID elementu (np. "id").
 * @param {string|Node} [content=""] - Zawartość elementu (tekst lub Node).
 * @param {Object[]} [children=[]] - Tablica dzieci (obiekty opcji dla createElement).
 * @param {Object} [events={}] - Obiekt zdarzeń (np. {click: function}).
 * @returns {HTMLElement} Utworzony element DOM.
 */
//! Create an element for the DOM
export const createElement = ({
  tag, //? Tag name div, p, a, etc.
  attributes = {}, //? Attributes object {id: "id", class: "class"}
  properties = {}, //? Properties object {innerText: "text", src: "src"}
  dataset = {}, //? Dataset object {id: "id", name: "name"}
  classes = [], //? Classes array ["class1", "class2"]
  id = null, //? ID string "id"
  content = "", //? Content string or Node
  children = [], //? Children array of objects
  events = {}, //? Events object {click: function}
}) => {
  const element = document.createElement(tag);
  //* Set ID if provided
  if (id) {
    element.id = id;
  }
  //* Add classes
  classes.forEach((cls) => element.classList.add(cls));
  //* Set attributes
  for (const key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
  //* Set properties
  for (const key in properties) {
    element[key] = properties[key];
  }
  //* Set dataset properties
  for (const key in dataset) {
    element.dataset[key] = dataset[key];
  }
  //* Set content
  if (typeof content === "string") {
    element.innerHTML = content;
  } else if (content instanceof Node) {
    element.appendChild(content);
  }
  //* Append children
  children.forEach((child) => {
    element.appendChild(createElement(child));
  });
  //* Add event listeners
  for (const [event, handler] of Object.entries(events)) {
    element.addEventListener(event, handler);
  }
  return element;
};
