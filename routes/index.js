const router = require("express").Router();
const { language } = require("../addons/language");

/**
 * @route GET /
 * @description Endpoint do renderowania widoku `index`. Jeśli użytkownik jest zalogowany (token jest obecny), zostaje przekierowany do `/api/main`. W przeciwnym razie wyświetla stronę główną.
 *
 * @param {Object} req - Obiekt żądania HTTP.
 * @param {Object} res - Obiekt odpowiedzi HTTP.
 *
 * @returns {HTML} - Renderowany widok `index` z odpowiednimi komunikatami językowymi i rolą użytkownika.
 * @returns {Redirect} - Przekierowuje do `/api/main`, jeśli użytkownik jest zalogowany.
 *
 * @success {200} - Renderuje widok `index` z komunikatami językowymi oraz rolą użytkownika.
 * @redirect {302} - Przekierowuje do `/api/main`, jeśli użytkownik jest zalogowany.
 */
//! Landing page
router.get("/", async (req, res) => {
  //* Check token
  const token = req.header("auth-token") || req.cookies["auth-token"];
  if (token) {
    return res.redirect("/api/main");
  }
  const texts = await language(req);
  //* Set role
  const role = req.user ? req.user.role : process.env.GUEST_PERMISSIONS;
  //* Send the appropriate HTML
  res.render("index", {
    language: req.language,
    messages: texts.texts,
    errors: texts.errors,
    user: { role: role },
  });
});

module.exports = router;
