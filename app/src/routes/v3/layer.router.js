const Router = require("koa-router");
const logger = require("logger");
const LayerModel = require("models/layer.model");
const LayerSerializer = require("serializers/layer.serializer");
const UserMiddleware = require("middleware/user.middleware");
const LayerService = require("services/layer.service");
const LayerValidator = require("validators/layer.validator");
const TeamService = require("services/team.service");
//const lossLayerProvider = require("lossLayer.provider");
//const TileNotFoundError = require("TileNotFoundError");
const V3TeamService = require("../../services/v3TeamService");
const V3LayerService = require("../../services/v3LayerService");

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
      team = await V3TeamService.getTeam(owner.id);
    } catch (e) {
      logger.error(e);
      ctx.throw(500, "Team retrieval failed.");
    }

    // get list of user teams
    const userTeams = await V3TeamService.getUserTeams(ctx.request.body.user.id);
    const userTeam = userTeams.find(team => team.id === owner.id);
    const isManager = userTeam && ["manager", "administrator"].includes(userTeam.userRole);

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
        await V3TeamService.patchTeamById(owner.id, {
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
    ctx.status = 200;
  }

  static async patchLayer(ctx) {
    logger.info("Patch layer by id");
    const { layerId } = ctx.params;
    const { body } = ctx.request;
    let layer = null;
    try {
      layer = await LayerModel.findOne({ _id: layerId });
      if (!layer) ctx.throw(404, "Layer not found");
    } catch (e) {
      logger.error(e);
      ctx.throw(500, "Layer retrieval failed.");
    }
    let teamUsers = null;
    if (layer.owner.type === V3LayerService.type.TEAM) {
      try {
        teamUsers = await V3TeamService.getTeamUsers(layer.owner.id);
      } catch (e) {
        logger.error(e);
        ctx.throw(500, "Team users retrieval failed.");
      }
    }
    const enabled = V3LayerService.getEnabled(layer, body, teamUsers);
    const isPublic = V3LayerService.updateIsPublic(layer, body);
    layer = Object.assign(layer, body, { isPublic, enabled });
    try {
      await layer.save();
    } catch (e) {
      logger.error("Layer patch save failed", e);
      ctx.throw(500, "Layer update failed.");
    }

    ctx.body = LayerSerializer.serialize(layer);
    ctx.status = 204;
  }

  static async deleteLayer(ctx) {
    const { layerId } = ctx.params;
    logger.info(`Delete layer with id ${layerId}`);
    let layer = null;
    try {
      layer = await LayerModel.findOne({ _id: layerId });
      if (!layer) ctx.throw(404, "Layer not found");
    } catch (e) {
      logger.error(e);
      ctx.throw(500, "Layer retrieval failed.");
    }
    let teamUsers = [];
    if (layer.owner.type === LayerService.type.TEAM) {
      try {
        teamUsers = await V3TeamService.getTeamUsers(layer.owner.id);
      } catch (e) {
        logger.error(e);
        ctx.throw(500, "Team users retrieval failed.");
      }
    }
    const hasPermission = await V3LayerService.canDeleteLayer(layer, ctx.request.body.user, teamUsers);
    if (hasPermission) {
      try {
        await LayerModel.remove({ _id: layerId });
      } catch (e) {
        logger.error(e);
        ctx.throw(500, "Layer deletion failed.");
      }
    } else {
      ctx.throw(403, "Forbidden");
    }
    ctx.body = "";
    ctx.status = 204;
  }

  static async deleteAllUserLayers(ctx) {
    logger.info(`Deleting all layers for user with id ${ctx.request.body.user}`);

    await LayerModel.deleteMany({ "owner.id": ctx.request.body.user.id });

    ctx.body = "";
    ctx.status = 204;
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

router.patch("/:layerId", isAuthenticatedMiddleware, ...Layer.middleware, LayerValidator.patch, Layer.patchLayer);
router.post(
  "/team/:teamId",
  isAuthenticatedMiddleware,
  ...Layer.middleware,
  LayerValidator.create,
  Layer.createTeamLayer
);
router.delete("/deleteAllUserLayers", isAuthenticatedMiddleware, ...Layer.middleware, Layer.deleteAllUserLayers);
router.delete("/:layerId", isAuthenticatedMiddleware, ...Layer.middleware, Layer.deleteLayer);

module.exports = router;
