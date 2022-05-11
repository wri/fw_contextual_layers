const nock = require("nock");
const config = require("config");
const { ObjectId } = require("mongoose").Types;
const Layer = require("models/layer.model");

const mockGetUserFromToken = userProfile => {
  nock(config.get("controlTower.url"), { reqheaders: { authorization: "Bearer abcd" } })
    .get("/auth/user/me")
    .reply(200, userProfile);
};

const createTeamLayer = async teamId => {
  const layer = new Layer({
    name: "layer",
    url: "url",
    owner: {
      id: teamId,
      type: "TEAM"
    },
    enabled: true,
    isPublic: false
  });

  return await layer.save();
};

module.exports = {
  mockGetUserFromToken,
  createTeamLayer
};
