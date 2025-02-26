import { messages, showMessage } from "./messages.js";
import { getSVG } from "./svg.js";
import { copyCode } from "./code.js";

/**
 * Inicjalizuje funkcje ustawień użytkownika.
 *
 * @function initAccount
 * @see {@link changeNickname} - Funkcja zmieniająca pseudonim użytkownika.
 * @see {@link copyCode} - Funkcja kopiująca kod aktywacyjny.
 * @see {@link changePassword} - Funkcja zmieniająca hasło użytkownika.
 * @see {@link changeEmail} - Funkcja zmieniająca adres e-mail użytkownika.
 * @see {@link toggleInputs} - Funkcja zmieniająca ustawienia użytkownika (checkboxy).
 * @returns {Promise<void[]>} Obietnica, która rozwiązuje się, gdy wszystkie funkcje formularzy zostaną uruchomione.
 */
//! Load necessary functions
export const initAccount = () => {
  return Promise.all([
    changeNickname(),
    copyCode(".account-list_account-activation_code button"),
    changePassword(),
    changeEmail(),
    toggleInputs(),
  ]);
};

/**
 * Przełącza ustawienia użytkownika za pomocą checkboxów np. tryb ciemny, losowa kolejność pytań.
 *
 * @async
 * @function toggleInputs
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {NodeList} target - Lista elementów wejściowych (inputów) do przełączenia.
 * @property {number} lastToggleTime - Czas ostatniego przełączenia.
 * @property {number} toggleDelay - Opóźnienie przełączenia (domyślnie 1 sekunda).
 * @property {Object} dataInput - Obiekt zawierający dane wejściowe.
 * @property {string} dataInput.type - Typ danych do przełączenia.
 * @property {boolean} dataInput.value - Wartość danych do przełączenia.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Komunikat z odpowiedzi w formie obiektu wiadomości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po przełączeniu stanu wejść.
 * @property {error} targetError - Komunikat o błędzie, jeśli elementy wejściowe nie zostaną znalezione.
 * @property {error} timeoutMessage - Komunikat o błędzie, jeśli przełączenie jest zbyt szybkie.
 * @property {error} dataInputError - Komunikat o błędzie, jeśli dane są puste.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Toggle inputs
const toggleInputs = async () => {
  //* Check if elements exist
  const target = document.querySelectorAll(".account-list_account input[type='checkbox']");
  //* Error message
  const targetError = messages.errors.toggle_inputs_not_found;
  if (!target || target.length <= 0)
    return showMessage(targetError.message, targetError.description);
  //* Timer for toggling the inputs
  let lastToggleTime = 0;
  const toggleDelay = 1000; //? 1 second delay
  //* Add event listener
  target.forEach((element) => {
    element.addEventListener("change", async (event) => {
      event.preventDefault();
      //* Check if changing the input is too fast
      const currentTime = new Date().getTime();
      if (currentTime - lastToggleTime < toggleDelay) {
        const timeoutMessage = messages.errors.toggle_inputs_timeout;
        showMessage(timeoutMessage.message, timeoutMessage.description);
        element.checked = !element.checked;
        return;
      }
      lastToggleTime = currentTime;
      //* Get the data
      const dataInput = {
        type: element.dataset.id,
        value: element.checked,
      };
      const dataInputError = messages.errors.empty_data;
      if (!dataInput.type) return showMessage(dataInputError.message, dataInputError.description);
      //* Send the data to the server
      await fetch("/api/account/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataInput),
      })
        .then(async (response) => {
          if (response.status !== 200) {
            return response.json().then((error) => {
              showMessage(error.message, error.description);
            });
          }
          return response.json().then((data) => {
            showMessage(data.message, "", "success");
            //* Reload the page if darkmode is toggled
            dataInput.type == "darkmode" ? location.reload() : null;
          });
        })
        .catch((error) => {
          showMessage(error.message, error.description);
        });
    });
  });
};

/**
 * Zmienia adres e-mail użytkownika.
 *
 * @async
 * @function changeEmail
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {HTMLElement} target - Element zawierający formularz zmiany adresu e-mail.
 * @property {FormData} formData - Dane z formularza.
 * @property {Object} dataEmail - Obiekt zawierający dane adresu e-mail.
 * @property {string} dataEmail.old_email - Stary adres e-mail użytkownika.
 * @property {string} dataEmail.email - Nowy adres e-mail użytkownika.
 * @property {string} dataEmail.password - Hasło użytkownika.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiaodmości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie adresu e-mail.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy nie zostanie znaleziony.
 * @property {error} emailError - Komunikat o błędzie, jeśli dane adresu e-mail są puste.
 * @property {error} sameEmail - Komunikat o błędzie, jeśli nowy adres e-mail jest taki sam jak stary.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Change email
const changeEmail = async () => {
  //* Check if elements exist
  const target = document.getElementById("change_email_form");
  //* Error message
  const targetError = messages.errors.change_email_form_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Add event listener
  target.addEventListener("submit", async (event) => {
    event.preventDefault();
    //* Get the form data
    const formData = new FormData(target);
    const dataEmail = {
      old_email: formData.get("email_current"),
      email: formData.get("email_new"),
      password: formData.get("email_password"),
    };
    //* Check data
    const emailError = messages.errors.empty_email;
    if (!dataEmail.old_email || !dataEmail.password || !dataEmail.email)
      return showMessage(emailError.message, emailError.description);
    //* Check if the passwords are the same
    const sameEmail = messages.errors.old_new_email;
    if (dataEmail.old_email === dataEmail.email)
      return showMessage(sameEmail.message, sameEmail.description);
    //* Send the data to the server
    await fetch("api/account/email", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataEmail),
    })
      .then(async (response) => {
        if (response.status !== 200) {
          return response.json().then((error) => {
            showMessage(error.message, error.description);
          });
        }
        return response.json().then((data) => {
          //* Reset the form
          target.reset();
          showMessage(data.message, "", "success");
        });
      })
      .catch((error) => {
        showMessage(error.message, error.description);
      });
  });
};

/**
 * Zmienia hasło użytkownika.
 *
 * @async
 * @function changePassword
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @property {HTMLElement} target - Element zawierający formularz zmiany hasła.
 * @property {HTMLElement} button - Przycisk zmiany hasła.
 * @property {FormData} formData - Dane z formularza.
 * @property {Object} dataPassword - Obiekt zawierający dane hasła.
 * @property {string} dataPassword.old_password - Pole tekstowe starego hasła.
 * @property {string} dataPassword.password - Pole tekstowe nowego hasła.
 * @property {string} dataPassword.repassword - Pole tekstowe potwierdzenia nowego hasła.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiaodmości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie hasła.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy nie zostanie znaleziony.
 * @property {error} passwordError - Komunikat o błędzie, jeśli dane hasła są puste.
 * @property {error} passwordMatch - Komunikat o błędzie, jeśli hasła nie są takie same.
 * @property {error} samePassword - Komunikat o błędzie, jeśli nowe hasło jest takie samo jak stare.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Change password
const changePassword = async () => {
  //* Check if elements exist
  const target = document.getElementById("change_password_form");
  //* Error message
  const targetError = messages.errors.change_password_form_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Add event listener
  target.addEventListener("submit", async (event) => {
    event.preventDefault();
    //* Get the form data
    const formData = new FormData(target);
    const dataPassword = {
      old_password: formData.get("password_current"),
      password: formData.get("password_new"),
      repassword: formData.get("password_new_repeat"),
    };
    //* Check data
    const passwordError = messages.errors.empty_password;
    if (!dataPassword.old_password || !dataPassword.password || !dataPassword.repassword)
      return showMessage(passwordError.message, passwordError.description);
    //* Check if the passwords match
    const passwordMatch = messages.errors.same_password;
    if (dataPassword.password !== dataPassword.repassword)
      return showMessage(passwordMatch.message, passwordMatch.description);
    //* Check if the passwords are the same
    const samePassword = messages.errors.old_new_password;
    if (dataPassword.old_password === dataPassword.password)
      return showMessage(samePassword.message, samePassword.description);
    //* Send the data to the server
    await fetch("api/account/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataPassword),
    })
      .then(async (response) => {
        if (response.status !== 200) {
          return response.json().then((error) => {
            showMessage(error.message, error.description);
          });
        }
        return response.json().then((data) => {
          //* Reset the form
          target.reset();
          showMessage(data.message, "", "success");
        });
      })
      .catch((error) => {
        showMessage(error.message, error.description);
      });
  });
};

/**
 * Zmienia pseudonim użytkownika w panelu użytkownika.
 *
 * @async
 * @function changeNickname
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @see {@link getSVG} - Funkcja zwracająca kod SVG.
 * @property {HTMLElement} target - Element, w którym znajduje się formularz zmiany pseudonimu.
 * @property {HTMLElement} button - Przycisk zmiany pseudonimu.
 * @property {HTMLElement} nickname - Pole tekstowe pseudonimu.
 * @property {HTMLElement} navNickname - Pseudonim w nawigacji.
 * @property {string} oldNickname - Stary pseudonim użytkownika.
 * @property {string} newNickname - Nowy pseudonim użytkownika.
 * @property {string} editSVG - Kod SVG ikony edycji.
 * @property {string} confirmSVG - Kod SVG ikony potwierdzenia.
 * @property {Response} response - Odpowiedź z serwera.
 * @property {Object} data - Dane z odpowiedzi w formie obiektu wiaodmości.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się po zmianie pseudonimu.
 * @property {error} targetError - Komunikat o błędzie, jeśli element docelowy nie zostanie znaleziony.
 * @property {error} sameNickname - Komunikat o błędzie, jeśli nowy pseudonim jest taki sam jak stary.
 * @throws {error} Komunikat o błędzie, zależnie od rodzaju błędu.
 */
//! Change the nickname
const changeNickname = async () => {
  //* Check if elements exist
  const target = document.querySelector(".account-list_account-content");
  //* Error message
  const targetError = messages.errors.nickname_form_not_found;
  if (!target) return showMessage(targetError.message, targetError.description);
  //* Get old value
  let oldNickname = target.querySelector("input[name='nickname']").value;
  //* Get the button
  const button = target.querySelector("button");
  if (!button) return showMessage(targetError.message, targetError.description);
  //* Add event listener
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    //* Get the SVG icons
    const editSVG = getSVG("edit");
    const confirmSVG = getSVG("confirm");
    //* Change the button icon
    const changeIcon = () => {
      button.dataset.button = button.dataset.button === "edit" ? "confirm" : "edit";
      button.dataset.button === "edit"
        ? (button.innerHTML = editSVG)
        : (button.innerHTML = confirmSVG);
    };
    const nickname = target.querySelector("input[name='nickname']");
    if (!nickname) return showMessage(targetError.message, targetError.description);
    //* Change the button dataset
    if (button.dataset.button === "edit") {
      //* Remove the readonly
      nickname.removeAttribute("readonly");
      changeIcon();
    } else {
      //* Get the new nickname
      const newNickname = nickname.value;
      //* Check if the nickname is the same
      if (oldNickname === newNickname) {
        changeIcon();
        const sameNickname = messages.errors.same_nickname;
        return showMessage(sameNickname.message, sameNickname.description);
      }
      //* Add the readonly
      nickname.setAttribute("readonly", true);
      //* Send the new nickname to the server
      await fetch("api/account/name", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newNickname }),
      })
        .then(async (response) => {
          if (response.status !== 200) {
            return response.json().then((error) => {
              showMessage(error.message, error.description);
              nickname.removeAttribute("readonly");
            });
          }
          return response.json().then((data) => {
            oldNickname = newNickname;
            showMessage(data.message, "", "success");
            changeIcon();
            //* Change the nickname in the navbar
            const navNickname = document.getElementById("navbar-items-profile-text");
            if (navNickname) navNickname.textContent = newNickname;
          });
        })
        .catch((error) => {
          showMessage(error.message, error.description);
          nickname.removeAttribute("readonly");
        });
    }
  });
};
