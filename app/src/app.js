const Koa = require("koa");
const cors = require("@koa/cors");
const logger = require("logger");
const koaLogger = require("koa-logger");
const config = require("config");
const loader = require("loader");
const convert = require("koa-convert");
const ErrorSerializer = require("serializers/error.serializer");
const validate = require("koa-validate");
const mongoose = require("mongoose");
const koaBody = require("koa-body")({
  multipart: true,
  jsonLimit: "50mb",
  formLimit: "50mb",
  textLimit: "50mb"
});
const loggedInUserService = require("./services/LoggedInUserService");
const Sentry = require("@sentry/node");


let dbSecret = config.get("mongodb.secret");
if (typeof dbSecret === "string") {
  dbSecret = JSON.parse(dbSecret);
}

const mongoURL =
  "mongodb://" +
  `${dbSecret.username}:${dbSecret.password}` +
  `@${config.get("mongodb.host")}:${config.get("mongodb.port")}` +
  `/${config.get("mongodb.database")}`;

mongoose.Promise = Promise;

mongoose.connect(mongoURL, err => {
  if (err) {
    logger.error(err);
    throw new Error(err);
  }
});

const app = new Koa();

/** 
 * Sentry
 */
Sentry.init({ dsn: "https://23078bc49f3e4aa5a93e6c7610707bfc@o163691.ingest.sentry.io/6262295" });

app.on("error", (err, ctx) => {
  Sentry.withScope(function (scope) {
    scope.addEventProcessor(function (event) {
      return Sentry.Handlers.parseRequest(event, ctx.request);
    });
    Sentry.captureException(err);
  });
});

myUndefinedFunction();
/** */

app.use(convert.back(cors()));
app.use(convert(koaBody));
validate(app);

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (inErr) {
    let error = inErr;
    try {
      error = JSON.parse(inErr);
    } catch (e) {
      logger.debug("Could not parse error message - is it JSON?: ", inErr);
      error = inErr;
    }
    ctx.status = error.status || ctx.status || 500;
    if (ctx.status >= 500) {
      logger.error(error);
    } else {
      logger.info(error);
    }

    ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
    if (process.env.NODE_ENV === "prod" && ctx.status === 500) {
      ctx.body = "Unexpected error";
    }
    ctx.response.type = "application/vnd.api+json";
  }
});

app.use(koaLogger());

app.use(async (ctx, next) => {
  await loggedInUserService.setLoggedInUser(ctx, logger);
  await next();
});

loader.loadRoutes(app);

const server = app.listen(config.get("service.port"), () => {});

logger.info("Server started in ", config.get("service.port"));

module.exports = server;
