const { ObjectId } = require("mongoose").Types;
const { getTestServer } = require("../../test/mocha/utils/test-server");
const { USERS } = require("../../test/mocha/utils/test.constants");
const Layer = require("models/layer.model");

const nock = require("nock");
const config = require("config");
const { mockGetUserFromToken } = require("../../test/mocha/utils/helpers");
const { createTeamLayer, createUserLayer } = require("../../test/jest/utils/helpers");
//const { expect } = require("chai");

const requester = getTestServer();

describe("Create a team layer", function () {
  beforeEach(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }

    await Layer.deleteMany({}).exec();
  });

  it('Create layer as an anonymous user should return an "Not logged" error with matching 401 HTTP code', async function () {
    const response = await requester.post(`/v3/contextual-layer/team/1`).send();

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0]).toHaveProperty("status", 401);
    expect(response.body.errors[0]).toHaveProperty("detail", "Unauthorized");
  });

  it("Creates a team layer if the user is a manager of the team", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const userId = USERS.USER.id;

    const layer = {
      name: "layer",
      url: "url",
      owner: {
        id: userId,
        type: "owner type"
      },
      enabled: true
    };

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/user/${USERS.USER.id}`)
      .reply(200, {
        data: [
          {
            id: teamId,
            attributes: {
              userRole: "manager"
            }
          }
        ]
      });

    nock(config.get("teamsAPI.url"))
      .get(`/teams/${teamId}`)
      .reply(200, {
        data: { id: teamId }
      });

    nock(config.get("teamsAPI.url"))
      .patch(`/teams/${teamId}`)
      .reply(200, {
        data: {
          id: teamId,
          attributes: {}
        }
      });

    const response = await requester
      .post(`/v3/contextual-layer/team/${teamId}`)
      .set("Authorization", `Bearer abcd`)
      .send(layer);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toHaveProperty("attributes");
    expect(response.body.data.attributes).toHaveProperty("owner", { id: teamId.toString(), type: "TEAM" });

    const layers = await Layer.find({});
    expect(layers.length).toBe(1);
    expect(layers[0]).toHaveProperty("_id", new ObjectId(response.body.data.id));
  });

  it("Returns forbidden if the user is not a manager of the team", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const userId = USERS.USER.id;

    const layer = {
      name: "layer",
      url: "url",
      owner: {
        id: userId,
        type: "TEAM"
      },
      enabled: true
    };

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/user/${USERS.USER.id}`)
      .reply(200, {
        data: [
          {
            id: teamId,
            attributes: {
              userRole: "monitor"
            }
          }
        ]
      });

    nock(config.get("teamsAPI.url"))
      .get(`/teams/${teamId}`)
      .reply(200, {
        data: { id: teamId }
      });

    const response = await requester
      .post(`/v3/contextual-layer/team/${teamId}`)
      .set("Authorization", `Bearer abcd`)
      .send(layer);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors[0]).toHaveProperty("status", 403);
    expect(response.body.errors[0]).toHaveProperty("detail", "Only team managers can create team layers.");

    const layers = await Layer.find({});
    expect(layers.length).toBe(0);
  });

  afterEach(async function () {
    await Layer.deleteMany({}).exec();
    nock.cleanAll();
  });
});

describe("Delete a layer", function () {
  beforeEach(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }
    await Layer.deleteMany({}).exec();
  });

  it('Create layer as an anonymous user should return an "Not logged" error with matching 401 HTTP code', async function () {
    const response = await requester.delete(`/v3/contextual-layer/1`).send();

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0]).toHaveProperty("status", 401);
    expect(response.body.errors[0]).toHaveProperty("detail", "Unauthorized");
  });

  it("Deletes a team layer if the user is a manager of the team", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.USER.id,
              role: "manager"
            }
          }
        ]
      });

    const response = await requester
      .delete(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    expect(response.status).toBe(204);
  });

  it("Deletes a team layer if the user is a administrator of the team", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.USER.id,
              role: "administrator"
            }
          }
        ]
      });

    const response = await requester
      .delete(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    expect(response.status).toBe(204);
  });

  it("Fails to delete a team layer if the user is not a manager/administrator", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.USER.id,
              role: "monitor"
            }
          }
        ]
      });

    const response = await requester
      .delete(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0]).toHaveProperty("status", 403);
    expect(response.body.errors[0]).toHaveProperty("detail", "Forbidden");
  });

  it("Deletes a team layer if the user is an ADMIN", async function () {
    mockGetUserFromToken(USERS.ADMIN);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.ADMIN.id,
              role: "monitor"
            }
          }
        ]
      });

    const response = await requester
      .delete(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    expect(response.status).toBe(204);
  });

  afterEach(async function () {
    await Layer.deleteMany({}).exec();
    nock.cleanAll();
  });
});

describe("Update a layer", function () {
  beforeEach(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }
    await Layer.deleteMany({}).exec();
  });

  it('Update layer as an anonymous user should return an "Not logged" error with matching 401 HTTP code', async function () {
    const response = await requester.patch(`/v3/contextual-layer/1`).send();

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0]).toHaveProperty("status", 401);
    expect(response.body.errors[0]).toHaveProperty("detail", "Unauthorized");
  });

  it("Update user layer as layer creator", async function () {
    mockGetUserFromToken(USERS.USER);

    const layer = await createUserLayer(USERS.USER.id);

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(false);
    expect(newLayer.isPublic).toBe(false);
  });

  it("Update user layer as ADMIN", async function () {
    mockGetUserFromToken(USERS.ADMIN);

    const layer = await createUserLayer(USERS.ADMIN.id);

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(false);
    expect(newLayer.isPublic).toBe(true);
  });

  it("Fail to update user layer as a different user", async function () {
    mockGetUserFromToken(USERS.USER);

    const layer = await createUserLayer(new ObjectId());

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(false);
    expect(newLayer.isPublic).toBe(false);
  });

  it("Update team layer as a manager", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, [
        {
          data: {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.USER.id,
              role: "manager"
            }
          }
        }
      ]);

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(false);
    expect(newLayer.isPublic).toBe(false);
  });

  it("Update team layer as an administrator", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.USER.id,
              role: "administrator"
            }
          }
        ]
      });

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(false);
    expect(newLayer.isPublic).toBe(false);
  });

  it("Fail to update a team layer as a monitor", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.USER.id,
              role: "monitor"
            }
          }
        ]
      });

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(true);
    expect(newLayer.isPublic).toBe(false);
  });

  it("Fail to update a team layer as ADMIN", async function () {
    mockGetUserFromToken(USERS.ADMIN);

    const teamId = new ObjectId();
    const layer = await createTeamLayer(teamId);

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/${teamId}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId,
              userId: USERS.ADMIN.id,
              role: "monitor"
            }
          }
        ]
      });

    const response = await requester
      .patch(`/v3/contextual-layer/${layer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send({
        isPublic: true,
        enabled: false
      });

    expect(response.status).toBe(204);
    const newLayer = await Layer.findById(layer._id);
    expect(newLayer.enabled).toBe(true);
    expect(newLayer.isPublic).toBe(false);
  });

  afterEach(async function () {
    await Layer.deleteMany({}).exec();
    nock.cleanAll();
  });
});

describe("Delete all user layers", function () {
  beforeEach(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }
    await Layer.deleteMany({}).exec();
  });

  it('Delete layers as an anonymous user should return an "Not logged" error with matching 401 HTTP code', async function () {
    const response = await requester.delete(`/v3/contextual-layer/1`).send();

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0]).toHaveProperty("status", 401);
    expect(response.body.errors[0]).toHaveProperty("detail", "Unauthorized");
  });

  it("Deletes all user layers", async function () {
    mockGetUserFromToken(USERS.USER);

    const teamId = new ObjectId();
    const teamLayer = await createTeamLayer(teamId);
    await createUserLayer(USERS.USER.id);
    await createUserLayer(USERS.USER.id);
    const differentUserLayer1 = await createUserLayer(new ObjectId());

    const startingLayers = await Layer.find({});
    expect(startingLayers.length).toBe(4);

    const response = await requester
      .delete(`/v3/contextual-layer/deleteAllUserLayers`)
      .set("Authorization", `Bearer abcd`)
      .send();

    expect(response.status).toBe(204);

    const layers = await Layer.find({});
    expect(layers.length).toBe(2);
    expect(layers[0]._id).toEqual(teamLayer._id);
    expect(layers[1]._id).toEqual(differentUserLayer1._id);
  });

  afterEach(async function () {
    await Layer.deleteMany({}).exec();
    nock.cleanAll();
  });
});
