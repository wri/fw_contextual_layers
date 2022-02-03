const logger = require("logger");
const axios = require("axios");
const config = require("config");
const loggedInUserService = require("./LoggedInUserService");

class TeamService {
  static async getTeam(teamId) {
    logger.info("Get team");
    const baseURL = config.get("teamsAPI.url");
    const response = await axios.default({
      baseURL,
      url: `/teams/${teamId}`,
      method: "GET",
      headers: {
        authorization: loggedInUserService.token,
      },
    });
    const team = response.data;
    if (!team || !team.data) return null;
    return { ...team.data.attributes, id: team.data.id };
  }

  static async getTeamByUserId(userId) {
    logger.info("Get team by user id");
    const baseURL = config.get("teamsAPI.url");
    const response = await axios.default({
      baseURL,
      url: `/teams/user/${userId}`,
      method: "GET",
      headers: {
        authorization: loggedInUserService.token,
      },
    });
    const team = response.data;
    if (!team || !team.data) return null;
    return { ...team.data.attributes, id: team.data.id };
  }

  static async patchTeamById(teamId, body) {
    logger.info("Get team by user id");
    const baseURL = config.get("teamsAPI.url");
    const response = await axios.default({
      baseURL,
      url: `/teams/${teamId}`,
      method: "PATCH",
      data: body,
      headers: {
        authorization: loggedInUserService.token,
      },
    });
    const team = response.data;
    return { ...team.data.attributes, id: team.data.id };
  }
}
module.exports = TeamService;
