Object.defineProperty(exports, '__esModule', { value: true });
exports.ResponseError = undefined;
class ResponseError extends Error {

    constructor(statusCode, body, response) {
        super();
        this.name = 'ResponseError';
        this.statusCode = statusCode;
        this.message = `${statusCode} - ${JSON && JSON.stringify ? JSON.stringify(body) : body}`;
        this.error = body;
        this.response = response;
    }

}
exports.ResponseError = ResponseError;
