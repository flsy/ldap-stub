FROM node:15.5.1-alpine3.10
WORKDIR /app

# Copy source files
COPY yarn.lock package.json tsconfig.json ./
COPY src/ ./src/

# Install deps
RUN yarn install

# Build the app
RUN yarn build

# Start the app
CMD ["yarn", "start"]