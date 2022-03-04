const Router = require("koa-router");
const logger = require("logger");

const router = new Router({
  prefix: "/dummy"
});

const isAuthenticatedMiddleware = async (ctx, next) => {
  logger.info(`Verifying if user is authenticated`);
  const { query, body } = ctx.request;

  const user = {
    ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}),
    ...body.loggedUser
  };

  if (!user || !user.id) {
    ctx.throw(401, "Unauthorized");
    return;
  }
  await next();
};

router.get("/", async ctx => {
  logger.info("Dummy Router: Hello World!");

  ctx.body = "Dummy Router: Hello World!";
});

router.get("/auth", isAuthenticatedMiddleware, async ctx => {
  logger.info("Dummy Authenticated Router: Hello World!");

  ctx.body = "Dummy Authenticated Router: Hello World!";
});

module.exports = router;
