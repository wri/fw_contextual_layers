const LayerModel = require("models/layer.model");

class V3LayerService {
  static get type() {
    return {
      USER: "USER",
      TEAM: "TEAM"
    };
  }

  static setIsPublic(data, owner) {
    return data.user.role === "ADMIN" && owner.type === V3LayerService.type.USER ? data.isPublic : false;
  }

  static updateIsPublic(layer, data) {
    return data.user.role === "ADMIN" && layer.owner.type === V3LayerService.type.USER ? data.isPublic : layer.isPublic;
  }

  static getEnabled(layer, data, team) {
    return !team || team.managers.some(manager => manager.id === data.user.id) ? data.enabled : layer.enabled;
  }

  static create(data, owner) {
    const isPublic = V3LayerService.setIsPublic(data, owner);
    const body = { ...data, isPublic, owner };
    return new LayerModel(body).save();
  }

  // eslint-disable-next-line consistent-return
  static async canDeleteLayer(layer, user, teamUsers) {
    if (user.role === "ADMIN") return true;
    if (layer.isPublic) return false;
    // eslint-disable-next-line default-case
    switch (layer.owner.type) {
      case V3LayerService.type.USER:
        return layer.owner.id.toString() === user.id;
      case V3LayerService.type.TEAM: {
        // find user in team and check if they're a manager/administrator
        let manager = teamUsers.find(
          teamUser =>
            teamUser.attributes.userId.toString() === user.id.toString() &&
            (teamUser.attributes.role === "manager" || teamUser.attributes.role === "administrator")
        );
        if (!manager) return false;
        else return true;
      }
    }
  }
}
module.exports = V3LayerService;
