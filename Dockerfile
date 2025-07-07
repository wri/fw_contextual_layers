FROM node:22

ENV NAME fw-contextual-layer

# Update and install required system packages
RUN apt-get update -y && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        bash git openssh-client openssh-server \
        python3 python3-pip \
        libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++ && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install bunyan globally
RUN yarn global add bunyan

# Set up the working directory and install dependencies
RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
COPY yarn.lock /opt/$NAME/yarn.lock
COPY .eslintrc /opt/$NAME/.eslintrc
WORKDIR /opt/$NAME
RUN yarn

# Copy remaining app files
COPY config /opt/$NAME/config
COPY ./app /opt/$NAME/app
COPY ./.babelrc /opt/$NAME/.babelrc
COPY ./tsconfig.json /opt/$NAME/tsconfig.json

# Build the project
RUN yarn build

# Expose application port
EXPOSE 3025

# Run the application
CMD ["node", "dist/app.js"]