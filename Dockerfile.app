# Use the official Node.js 22 image as the base
FROM node:22

# Install Git
RUN apt-get update && apt-get install -y git

# Set the working directory to /app
WORKDIR /app

# Copy dependency manifests (use yarn.lock for deterministic versions)
COPY package.json yarn.lock ./

# Clear Yarn cache and remove node_modules if exists
RUN yarn cache clean
RUN rm -rf node_modules

# Install dependencies using the lockfile (ensures esbuild matches vite's expectation)
RUN yarn install --frozen-lockfile

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the application will use
EXPOSE 3000

# Set the environment variables
ENV NODE_ENV=development
ENV PORT=3000

# Run the command to start the application using Yarn
CMD ["yarn", "start"]