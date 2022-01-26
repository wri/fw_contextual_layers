const LayerModel = require('models/layer.model');

class LayerService {

    static get type() {
        return {
            USER: 'USER',
            TEAM: 'TEAM'
        };
    }

    static setIsPublic(data, owner) {
        return (data.user.role === 'ADMIN') && (owner.type === LayerService.type.USER) ? data.isPublic : false;
    }

    static updateIsPublic(layer, data) {
        return (data.user.role === 'ADMIN') && (layer.owner.type === LayerService.type.USER) ? data.isPublic : layer.isPublic;
    }

    static getEnabled(layer, data, team) {
        return (!team || team.managers.some((manager) => manager.id === data.user.id)) ? data.enabled : layer.enabled;
    }

    static create(data, owner) {
        const isPublic = LayerService.setIsPublic(data, owner);
        const body = { ...data, isPublic, owner };
        return new LayerModel(body).save();
    }

    // eslint-disable-next-line consistent-return
    static canDeleteLayer(layer, user, team) {
        if (user.role === 'ADMIN') return true;
        if (layer.isPublic) return false;
        // eslint-disable-next-line default-case
        switch (layer.owner.type) {

            case LayerService.type.USER:
                return layer.owner.id.toString() === user.id;
            case LayerService.type.TEAM:
                return team.managers.some((manager) => manager.id === user.id);

        }
    }

}
module.exports = LayerService;
