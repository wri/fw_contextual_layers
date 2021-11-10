const Router = require('koa-router');
const logger = require('logger');
const LayerModel = require('models/layer.model');
const LayerSerializer = require('serializers/layer.serializer');
const UserMiddleware = require('middleware/user.middleware');
const LayerService = require('services/layer.service');
const LayerValidator = require('validators/layer.validator');
const TeamService = require('services/team.service');
const lossLayerProvider = require('lossLayer.provider');
const TileNotFoundError = require('TileNotFoundError');

const router = new Router({
    prefix: '/contextual-layer',
});

class Layer {

    static get middleware() {
        return [
            UserMiddleware.mapAuthToUser
        ];
    }

    static async getAll(ctx) {
        logger.info('Get all layers');
        const userId = ctx.request.body.user.id;
        const enabled = typeof ctx.request.query.enabled !== 'undefined'
            ? { enabled: ctx.request.query.enabled }
            : null;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId);
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Error while retrieving user team');
        }
        const teamLayers = team && Array.isArray(team.layers) ? team.layers : [];
        const query = {
            $and: [
                {
                    $or: [
                        { isPublic: true },
                        { 'owner.id': userId },
                        { _id: { $in: teamLayers } }
                    ]
                }
            ]
        };
        if (enabled) query.$and.push(enabled);
        const layers = await LayerModel.find(query, { 'owner.id': 0 });

        ctx.body = LayerSerializer.serialize(layers);
    }

    static async createUserLayer(ctx) {
        logger.info('Create layer');
        const owner = { type: LayerService.type.USER, id: ctx.request.body.user.id };
        let layer = null;
        try {
            layer = await LayerService.create(ctx.request.body, owner);
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Layer creation Failed.');
        }
        ctx.body = LayerSerializer.serialize(layer);
    }

    static async createTeamLayer(ctx) {
        logger.info('Create team layer');
        const owner = { type: LayerService.type.TEAM, id: ctx.params.teamId };
        let team = null;
        try {
            team = await TeamService.getTeam(owner.id);
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Team retrieval failed.');
        }
        const isManager = team && team.managers && team.managers.some((manager) => manager.id === ctx.request.body.user.id);
        if (isManager) {
            let layer = null;
            try {
                layer = await LayerService.create(ctx.request.body, owner);
            } catch (e) {
                logger.error(e);
                ctx.throw(500, 'Layer creation Failed.');
            }
            const layers = team.layers || [];
            try {
                await TeamService.patchTeamById(owner.id, { layers: [...layers, layer.id] });
            } catch (e) {
                logger.error(e);
                ctx.throw(500, 'Team patch failed.');
            }
            ctx.body = LayerSerializer.serialize(layer);
        } else {
            ctx.throw(403, 'Only team managers can create team layers.');
        }
    }

    static async patchLayer(ctx) {
        logger.info('Patch layer by id');
        const { layerId } = ctx.params;
        const { body } = ctx.request;
        let layer = null;
        try {
            layer = await LayerModel.findOne({ _id: layerId });
            if (!layer) ctx.throw(404, 'Layer not found');
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Layer retrieval failed.');
        }
        let team = null;
        if (layer.owner.type === LayerService.type.TEAM) {
            try {
                team = await TeamService.getTeam(layer.owner.id);
            } catch (e) {
                logger.error(e);
                ctx.throw(500, 'Team retrieval failed.');
            }
        }
        const enabled = LayerService.getEnabled(layer, body, team);
        const isPublic = LayerService.updateIsPublic(layer, body);
        layer = Object.assign(layer, body, { isPublic, enabled });
        try {
            await layer.save();
        } catch (e) {
            logger.error('Layer patch save failed', e);
            ctx.throw(500, 'Layer update failed.');
        }

        ctx.body = LayerSerializer.serialize(layer);
    }

    static async deleteLayer(ctx) {
        const { layerId } = ctx.params;
        logger.info(`Delete layer with id ${layerId}`);
        let layer = null;
        try {
            layer = await LayerModel.findOne({ _id: layerId });
            if (!layer) ctx.throw(404, 'Layer not found');
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Layer retrieval failed.');
        }
        let team = null;
        if (layer.owner.type === LayerService.type.TEAM) {
            try {
                team = await TeamService.getTeam(layer.owner.id);
            } catch (e) {
                logger.error(e);
                ctx.throw(500, 'Team retrieval failed.');
            }
        }
        const hasPermission = LayerService.canDeleteLayer(layer, ctx.request.body.user, team);
        if (hasPermission) {
            try {
                await LayerModel.remove({ _id: layerId });
            } catch (e) {
                logger.error(e);
                ctx.throw(500, 'Layer deletion failed.');
            }
        } else {
            ctx.throw(403, 'Forbidden');
        }
        ctx.body = '';
        ctx.statusCode = 204;
    }

    static async hansenLayer(ctx) {
        const {
            x, y, z, startYear, endYear
        } = ctx.params;
        logger.info(`Retrieving hansen tile: /${startYear}/${endYear}/${z}/${x}/${y}`);
        let data;
        try {
            data = await lossLayerProvider.getTile({
                z, x, y, startYear, endYear
            });
        } catch (e) {
            if (e instanceof TileNotFoundError) {
                ctx.throw(404, 'Tile not found');
            }
        }
        ctx.type = 'image/png';
        ctx.body = data;
    }

}

const isAuthenticatedMiddleware = async (ctx, next) => {
    logger.info(`Verifying if user is authenticated`);
    const { query, body } = ctx.request;

    const user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...body.loggedUser };

    if (!user || !user.id) {
        ctx.throw(401, 'Unauthorized');
        return;
    }
    await next();
};

router.get('/', isAuthenticatedMiddleware, ...Layer.middleware, LayerValidator.getAll, Layer.getAll);
router.post('/', isAuthenticatedMiddleware, ...Layer.middleware, LayerValidator.create, Layer.createUserLayer);
router.patch('/:layerId', isAuthenticatedMiddleware, ...Layer.middleware, LayerValidator.patch, Layer.patchLayer);
router.post('/team/:teamId', isAuthenticatedMiddleware, ...Layer.middleware, LayerValidator.create, Layer.createTeamLayer);
router.delete('/:layerId', isAuthenticatedMiddleware, ...Layer.middleware, Layer.deleteLayer);
router.get('/loss-layer/:startYear/:endYear/:z/:x/:y.png', LayerValidator.tile, Layer.hansenLayer);
module.exports = router;
