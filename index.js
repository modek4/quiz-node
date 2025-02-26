const port = process.env.PORT || 3000;
const compression = require("compression");
const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { runSelfCheck } = require("./addons/selfcheck");

//! Set up
dotenv.config();
app.use(compression());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());

//! Import routes
const indexRoute = require("./routes/index");
const tempRoute = require("./routes/temp"); //? This route is for testing purposes only
const textsRoute = require("./routes/texts");
const authRoute = require("./routes/auth");
const cardRoute = require("./routes/card");
const mainRoute = require("./routes/main");
const quizRoute = require("./routes/quiz");
const questionRoute = require("./routes/question");
const adminRoute = require("./routes/panel");
const reportRoute = require("./routes/report");
const academiesRoute = require("./routes/academy");
const acitvationCodeRoute = require("./routes/code");
const termRoute = require("./routes/term");
const usersRoute = require("./routes/user");
const notificationRoute = require("./routes/notification");
const scoresRoute = require("./routes/scores");
const accountRoute = require("./routes/account");

//! Routes
app.use("/", indexRoute);
app.use("/temp", tempRoute); //? This route is for testing purposes only
app.use("/api/texts", textsRoute);
app.use("/api/auth", authRoute);
app.use("/api/card", cardRoute);
app.use("/api/main", mainRoute);
app.use("/api/quiz", quizRoute);
app.use("/api/question", questionRoute);
app.use("/api/panel", adminRoute);
app.use("/api/report", reportRoute);
app.use("/api/academy", academiesRoute);
app.use("/api/code", acitvationCodeRoute);
app.use("/api/term", termRoute);
app.use("/api/user", usersRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/scores", scoresRoute);
app.use("/api/account", accountRoute);

//! Start server
runSelfCheck()
  .then((selfCheckPassed) => {
    if (selfCheckPassed) {
      console.clear();
      app.listen(port, () => {
        console.log(`Server is running on ${process.env.HOST}:${port}... 🚀`);
      });
    } else {
      console.log("Failed to pass selfcheck. Server will not start.");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Error during selfcheck:", error);
    process.exit(1);
  });
