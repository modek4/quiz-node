import { loadMessages } from "./addons/messages.js";
import { loadContent } from "./addons/content.js";

/**
 * Nasłuchuje zdarzenia DOMContentLoaded i ładuje wiadomości, ustawienia oraz zawartość quizu.
 *
 * @event quiz#DOMContentLoaded
 * @async
 * @function
 * @see {@link loadMessages} - Funkcja ładująca wiadomości.
 * @see {@link loadSettings} - Funkcja ładująca ustawienia z localStorage.
 * @see {@link loadContent} - Funkcja ładująca zawartość strony.
 * @property {string} view - Wyświetlanie pytań na stronie głównej.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy wszystkie dane zostaną załadowane.
 * @throws {Error} Jeśli wystąpi błąd podczas ładowania wiadomości, ustawień lub zawartości.
 */
//! Load content if DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadMessages();
    await loadSettings(settings);
    const view = localStorage.getItem("view");
    await loadContent(view);
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to load quiz", error);
    throw new Error("Failed to load quiz");
  }
});

/**
 * Ładuje ustawienia z podanego obiektu ustawień (zmienna z ejs) i synchronizuje je z localStorage.
 *
 * @async
 * @function loadSettings
 * @see {@link syncSetting} - Funkcja synchronizująca ustawienia z localStorage.
 * @param {string} settings - Obiekt ustawień w formacie JSON.
 * @property {boolean} autosave - Automatyczne zapisywanie postępów.
 * @property {boolean} darkmode - Tryb ciemny.
 * @property {string} display - Wyświetlanie pytań.
 * @property {boolean} explanation - Wyświetlanie wyjaśnień.
 * @property {boolean} open_question - Otwarte pytania.
 * @property {string} sort - Sortowanie pytań.
 * @property {string} academy_id - ID akademii.
 * @property {boolean} random - Losowanie pytań.
 * @property {boolean} livecheck - Sprawdzanie odpowiedzi na żywo.
 * @returns {Promise<Object>} Obietnica, która rozwiązuje się do obiektu zawierającego zsynchronizowane ustawienia.
 * @throws {Error} Jeśli wystąpi błąd podczas ładowania ustawień.
 */
//! Load settings from localStorage
const loadSettings = async (settings = null) => {
  //* Check if settings are provided
  if (settings === null) throw new Error("No settings provided");
  try {
    //* Convert settings to JSON
    settings = JSON.parse(settings);
    //* Synchronize all settings
    let autosave = syncSetting("autosave", settings.autosave);
    let darkmode = syncSetting("darkmode", settings.darkmode);
    let display = syncSetting("display", settings.display);
    let explanation = syncSetting("explanation", settings.explanation);
    let open_question = syncSetting("open_question", settings.open_question);
    let sort = syncSetting("sort", settings.sort);
    let academy_id = syncSetting("academy_id", settings.academy_id);
    let random = syncSetting("random", settings.random);
    let livecheck = syncSetting("livecheck", settings.livecheck);
    return {
      autosave,
      darkmode,
      display,
      explanation,
      open_question,
      sort,
      academy_id,
      livecheck,
      random,
    };
  } catch (error) {
    console.error("Failed to load texts", error);
    throw new Error("Failed to load settings");
  }
};

/**
 * Synchronizuje ustawienia z localStorage i zwraca ich wartość.
 *
 * @function syncSetting
 * @param {string} key - Klucz ustawienia.
 * @param {T} defaultValue - Wartość domyślna ustawienia.
 * @returns {T} Zsynchronizowana wartość ustawienia.
 * @template T
 */
//! Synchronize settings with localStorage
function syncSetting(key, defaultValue) {
  const storedValue = localStorage.getItem(key);
  //* Check if the value is null
  if (storedValue === null) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  //* Update the value if it's different from the stored one
  const parsedValue = JSON.parse(storedValue);
  if (parsedValue !== defaultValue) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return parsedValue;
}
