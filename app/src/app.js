const Koa = require("koa");
const logger = require("logger");
const koaLogger = require("koa-logger");
const config = require("config");
const loader = require("loader");
const convert = require("koa-convert");
const koaSimpleHealthCheck = require("koa-simple-healthcheck");
const ErrorSerializer = require("serializers/error.serializer");
const validate = require("koa-validate");
const mongoose = require("mongoose");
const koaBody = require("koa-body")({
  multipart: true,
  jsonLimit: "50mb",
  formLimit: "50mb",
  textLimit: "50mb",
});
const loggedInUserService = require("./services/LoggedInUserService");

mongoose.Promise = Promise;
const mongoUri =
  process.env.MONGO_URI ||
  `mongodb://${config.get("mongodb.host")}:${config.get(
    "mongodb.port"
  )}/${config.get("mongodb.database")}`;

mongoose.connect(mongoUri, (err) => {
  if (err) {
    logger.error(err);
    throw new Error(err);
  }
});

const app = new Koa();

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
app.use(koaSimpleHealthCheck());

app.use(async (ctx, next) => {
  await loggedInUserService.setLoggedInUser(ctx, logger);
  await next();
});

loader.loadRoutes(app);

const server = app.listen(process.env.PORT, () => {});

logger.info("Server started in ", process.env.PORT);

module.exports = server;
