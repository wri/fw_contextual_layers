# FW Context Layer Microservice

This repository includes the forest watcher context layers microservice for the WRI API.

## Dependencies

The FW Context Layer microservice is built using [Node.js](https://nodejs.org/en/), and can be executed using Docker.

Execution using Docker requires:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

Dependencies on other Microservices:
- [FW teams](https://github.com/wri/fw_teams)

## Getting started

Start by cloning the repository from github to your execution environment

```
git clone https://github.com/wri/fw_contextual_layers.git && cd fw_contextual_layers
```

After that, follow one of the instructions below:

### Using Docker

1 - Execute the following command to run Docker:

```shell
make up-and-build   # First time building Docker or you've made changes to the Dockerfile
make up             # When Docker has already been built and you're starting from where you left off
```

The endpoints provided by this microservice should now be available:
[localhost:3025](http://localhost:3025)\
OpenAPI docs will also be available at [localhost:30250](http://localhost:30250)

2 - Run the following command to lint the project:

```shell
make lint
```

3 - To close Docker:

```shell
make down
```

## Testing

### Using Docker

Follow the instruction above for setting up the runtime environment for Docker execution, then run:
```shell
make test-and-build
```

## Docs

The endpoints are documented using the OpenAPI spec and saved under `./docs`.\
A visualisation of these docs will be available to view in a web browser
when developing, please see above.

## Configuration

### Environment variables

- PORT => TCP port in which the service will run
- NODE_PATH => relative path to the source code. Should be `app/src`
- API_VERSION => API version identifier that prefixes the URL. Should be `v1`
- MONGO_PORT_27017_TCP_ADDR => IP/Address of the MongoDB server

You can optionally set other variables, see [this file](config/custom-environment-variables.json) for an extended list.
