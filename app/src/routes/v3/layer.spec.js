const { ObjectId } = require("mongoose").Types;
const { getTestServer } = require("../../test/mocha/utils/test-server");
const { USERS } = require("../../test/mocha/utils/test.constants");
const Layer = require("models/layer.model")

const nock = require("nock");
const config = require("config");
const { mockGetUserFromToken } = require("../../test/mocha/utils/helpers");

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

        const teamId = new ObjectId()
        const userId = USERS.USER.id

        const layer = {
            name: "layer",
            url: "url",
            owner: {
                id: userId,
                type: 'owner type'
            },
            enabled: true
        };

        nock(config.get("v3teamsAPI.url"))
            .get(`/teams/user/${USERS.USER.id}`)
            .reply(200, [
                {
                    id: teamId,
                    attributes: {
                        userRole: "manager"
                    }
                }
            ]);

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
        expect(response.body).toHaveProperty("data")
        expect(response.body.data).toHaveProperty("attributes")
        expect(response.body.data.attributes).toHaveProperty("owner", {id: teamId.toString(), type: "TEAM"})

        const layers = await Layer.find({});
        expect(layers.length).toBe(1);
        expect(layers[0]).toHaveProperty("_id", new ObjectId(response.body.data.id));

    });

    it("Returns forbidden if the user is not a manager of the team", async function () {
        mockGetUserFromToken(USERS.USER);

        const teamId = new ObjectId()
        const userId = USERS.USER.id

        const layer = {
            name: "layer",
            url: "url",
            owner: {
                id: userId,
                type: 'owner type'
            },
            enabled: true
        };

        nock(config.get("v3teamsAPI.url"))
            .get(`/teams/user/${USERS.USER.id}`)
            .reply(200, [
                {
                    id: teamId,
                    attributes: {
                        userRole: "monitor"
                    }
                }
            ]);

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
        expect(response.body).toHaveProperty("errors")
        expect(response.body.errors[0]).toHaveProperty("status", 403)
        expect(response.body.errors[0]).toHaveProperty("detail", "Only team managers can create team layers.")

        const layers = await Layer.find({});
        expect(layers.length).toBe(0);

    });

    afterEach(async function () {
        await Layer.deleteMany({}).exec();
        nock.cleanAll();
    });

});