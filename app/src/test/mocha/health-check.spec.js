/* eslint-disable */
const nock = require("nock");
const chai = require("chai");
const { getTestServer } = require("./utils/test-server");

chai.should();

let requester;

describe("GET /v1/fw_contextual_layers/healthcheck", function () {
  // eslint-disable-next-line mocha/no-hooks-for-single-case
  before(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }

    requester = await getTestServer();
  });

  it("Checking the application's health should return a 200", async function () {
    const response = await requester.get("/v1/fw_contextual_layers/healthcheck");

    response.status.should.equal(200);
    response.body.should.be.an("object").and.have.property("uptime");
  });

  // eslint-disable-next-line mocha/no-hooks-for-single-case
  afterEach(function () {
    if (!nock.isDone()) {
      throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
    }
  });
});
