const Router = require("koa-router");
const logger = require("logger");
const LayerModel = require("models/layer.model");
const LayerSerializer = require("serializers/layer.serializer");
const UserMiddleware = require("middleware/user.middleware");
const LayerService = require("services/layer.service");
const LayerValidator = require("validators/layer.validator");
const TeamService = require("services/team.service");
const lossLayerProvider = require("lossLayer.provider");
const TileNotFoundError = require("TileNotFoundError");
const V3TeamService = require("../../services/v3TeamService");

const router = new Router({
  prefix: "/contextual-layer"
});

class Layer {
  static get middleware() {
    return [UserMiddleware.mapAuthToUser];
  }

  static async createTeamLayer(ctx) {
    logger.info("Create team layer");
    const owner = { type: LayerService.type.TEAM, id: ctx.params.teamId };
    let team = null;
    try {
      team = await TeamService.getTeam(owner.id);
    } catch (e) {
      logger.error(e);
      ctx.throw(500, "Team retrieval failed.");
    }
    // get list of user teams
    let teams = await V3TeamService.getUserTeams(ctx.request.body.user.id);
    let matchingTeam = teams.find(obj => obj.id === owner.id);
    const isManager = matchingTeam && matchingTeam.attributes && (matchingTeam.attributes.userRole.toString() === "manager" || matchingTeam.attributes.userRole.toString() === "administrator");
    if (isManager) {
      let layer = null;
      try {
        layer = await LayerService.create(ctx.request.body, owner);
      } catch (e) {
        logger.error(e);
        ctx.throw(500, "Layer creation Failed.");
      }
      const layers = team.layers || [];
      try {
        await TeamService.patchTeamById(owner.id, {
          layers: [...layers, layer.id]
        });
      } catch (e) {
        logger.error(e);
        ctx.throw(500, "Team patch failed.");
      }
      ctx.body = LayerSerializer.serialize(layer);
    } else {
      ctx.throw(403, "Only team managers can create team layers.");
    }
    ctx.status = 200
  }
}

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

router.post(
  "/team/:teamId",
  isAuthenticatedMiddleware,
  ...Layer.middleware,
  LayerValidator.create,
  Layer.createTeamLayer
);

module.exports = router;
