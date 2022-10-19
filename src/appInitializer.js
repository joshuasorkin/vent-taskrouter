//this class is responsible for adding middleware to app
require("env2")(".env");

const session = require("express-session");
const bodyParser = require("body-parser");

const swaggerDocs = require("./swagger");

global.swagger = swaggerDocs;

class AppInitializer {
  swagger = null;

  constructor() {
    this.swagger = swaggerDocs;
  }

  initialize(app) {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    //etag control per https://stackoverflow.com/a/48404148/619177
    app.set("etag", "strong");
    this.swagger(app, 1337);
  }
}

module.exports = AppInitializer;
