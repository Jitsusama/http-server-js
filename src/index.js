const http = require("http");
const logging = require("@jitsusama/logging-js");
const express = require("express");

/** An HTTP server backed by Express. */
class Server {
  /**
   * Create a new HTTP server.
   * @constructor
   * @param {object} [options] - configuration options
   * @param {number | string} [options.port=8080] - port number to listen on
   * @param {RequestRouter[]} options.routers - request routers
   * @param {object} [options.logs] - logging configuration
   * @param {string} [options.logs.layer="http-server"] - layer to log as
   * @param {string} [options.logs.level="silent"] - logging level
   */
  constructor(options) {
    const { port = "8080", routers = [], logs } = options || {};
    const { layer = "http-server", level } = logs || {};
    const logger = logging.getLogger(layer, level);

    this.app = express();
    this.app.use(requestLogger(logger));
    for (const { path, router } of routers) this.app.use(path, router);
    this.app.use(responseLogger(logger));

    this.port = Number.parseInt(port);
    this.log = logger;
  }

  /**
   * Start the server.
   * @method
   * @returns {Promise<void>}
   */
  async start() {
    this.server = http.createServer(this.app);

    return new Promise((resolve, reject) => {
      const onError = (error) => {
        this.log.error({ reason: error.message }, "failed to start");
        reject(error);
      };

      try {
        this.server.on("error", onError).listen(this.port, () => {
          this.log.info(`listening for connections on port ${this.port}`);
          resolve();
        });
      } catch (error) {
        onError(error);
      }
    });
  }

  /**
   * Stop the server.
   * @method
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.server)
      return new Promise((resolve) =>
        this.server.close(() => {
          this.log.info("no longer listening for connections");
          resolve();
        })
      );
  }
}

/**
 * Wraps request handler logic so it is middleware friendly.
 * @function
 * @param {function(express.Request, express.Response):Promise<void>} logic
 * @returns {express.RequestHandler}
 */
const requestHandler = (logic) => {
  return async (request, response, next) => {
    try {
      await logic(request, response);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { Server, express, requestHandler };

/** @returns {express.RequestHandler} */
const requestLogger = (logger) => {
  /**
   * @param {express.Request} request
   * @param {express.Response} response
   * @param {express.NextFunction} next
   */
  return (request, response, next) => {
    const { method, path, headers } = request;
    logger.trace({ method, path, headers }, "received request");
    next();
  };
};

/**
 * @returns {express.RequestHandler}
 */
const responseLogger = (logger) => {
  /**
   * @param {express.Request} request
   * @param {express.Response} response
   * @param {express.NextFunction} next
   */
  return (request, response, next) => {
    const { statusCode, statusMessage, headers } = response;
    logger.trace({ statusCode, statusMessage, headers }, "sent response");
    next();
  };
};

/**
 * @typedef {object} RequestRouter
 * @property {string} path - the path to mount the router at
 * @property {express.Router} router - the request router
 */
