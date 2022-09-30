//this class is responsible for adding middleware to app
require("env2")(".env");

const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const express = require("express");

const Database = require("./config/database");
const swaggerDocs = require("./swagger");

const database = new Database();

global.swagger = swaggerDocs;

class AppInitializer {
  swagger = null;

  constructor() {
    this.swagger = swaggerDocs;
  }

  initialize(app) {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use("/other_route", require("./other_route").router);
    //todo: re-enable this session code?  or outsource session management to a SaaS like firebase?
    //app.use(session({ secret: process.env.SESSION_SECRET }));
    app.use(passport.initialize());
    //app.use(passport.session());
    app.use(flash());
    app.use("/public", express.static(__dirname + "/public"));
    app.use(express.static("public"));
    app.set("view engine", "pug");
    app.set("view options", { layout: false });
    //todo:should all the routes files go into /lib ?
    require("./browserRoutes.js")(app);
    this.swagger(app, 1337);
  }
}

module.exports = AppInitializer;
