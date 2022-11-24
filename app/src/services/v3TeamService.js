const axios = require("axios");
const config = require("config");
const logger = require("logger");
const loggedInUserService = require("./LoggedInUserService");

class V3TeamService {
  static async getUserTeams(user) {
    let teams = [];
    try {
      const baseURL = config.get("v3teamsAPI.url");
      const response = await axios.default({
        baseURL,
        url: `/teams/user/${user}`,
        method: "GET",
        headers: {
          authorization: loggedInUserService.token
        }
      });
      teams = response.data;
    } catch (e) {
      logger.info("Failed to fetch teams");
    }
    if (teams.length === 0) {
      logger.info("User does not belong to a team.");
    }
    return teams.data.map(team => ({...team.attributes, id: team.id}));
  }

  static async getTeamUsers(teamId) {
    let teams = [];
    try {
      const baseURL = config.get("v3teamsAPI.url");
      const response = await axios.default({
        baseURL,
        url: `/teams/${teamId}/users`,
        method: "GET",
        headers: {
          authorization: loggedInUserService.token
        }
      });
      teams = response.data;
    } catch (e) {
      logger.info("Failed to fetch users");
    }
    if (teams.length === 0) {
      logger.info("No users are on this team.");
    }
    return teams && teams.data;
  }

  static async getTeam(teamId) {
    logger.info("Get team");
    const baseURL = config.get("v3teamsAPI.url");
    const response = await axios.default({
      baseURL,
      url: `/teams/${teamId}`,
      method: "GET",
      headers: {
        authorization: loggedInUserService.token
      }
    });
    const team = response.data;
    if (!team || !team.data) return null;
    return { ...team.data.attributes, id: team.data.id };
  }

  static async patchTeamById(teamId, body) {
    logger.info("Get team by user id");
    const baseURL = config.get("v3teamsAPI.url");
    const response = await axios.default({
      baseURL,
      url: `/teams/${teamId}`,
      method: "PATCH",
      data: body,
      headers: {
        authorization: loggedInUserService.token
      }
    });
    const team = response.data;
    return { ...team.data.attributes, id: team.data.id };
  }
}

module.exports = V3TeamService;
