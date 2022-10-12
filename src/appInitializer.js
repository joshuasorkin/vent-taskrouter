//this class is responsible for adding middleware to app
require("env2")(".env");

const path = require("path");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const express = require("express");
const fetch = require("node-fetch");

const swaggerDocs = require("./swagger");

global.swagger = swaggerDocs;

let data = false;

function checkWebhookUrl(req, res, next) {
  if (data === false) {
    fetch(process.env.APP_BASE_URL).then((err, result) => {
      if (err) {
        let errMsg = `Error - Current webhook URL is not configured or working properly - ${process.env.APP_BASE_URL}`;
        console.error(errMsg);
        return res.send(errMsg);
      }
      console.log(`Webhook URL configured properly!`);
      data = true;
      res.status(200);
    });
  } else {
    next();
  }
}

class AppInitializer {
  swagger = null;

  constructor() {
    this.swagger = swaggerDocs;
  }

  initialize(app) {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use("/other_route", require("./other_route").router);
    app.use(passport.initialize());
    app.use(flash());
    // Had to re-instate this as I got an error saying, "flash() requires sessions"
    app.use(
      session({
        cookie: { maxAge: 60000 },
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use("/public", express.static(process.cwd() + "/public"));
    app.set("views", path.join(__dirname, "../public", "views"));
    app.set("view engine", "pug");
    app.set("view options", { layout: false });
    app.use(checkWebhookUrl);
    require("./browserRoutes.js")(app);
    this.swagger(app, 1337);
  }
}

module.exports = AppInitializer;
