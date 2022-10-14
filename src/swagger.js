const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

const version = require("../package.json").version;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Vent Taskrouter Public REST API Documentation",
      version,
    },
    components: {
      securitySchemas: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: {
      bearerAuth: [],
    },
  },
  apis: ["./src/server.js", "./src/routes/*.js", "./src/browserRoutes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app, port) {
  app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
  console.log(`Docs are running at http://localhost:${port}`);
}

module.exports = swaggerDocs;
