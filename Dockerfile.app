# Use the official Node.js 22 image as the base
FROM node:22

# Install Git
RUN apt-get update && apt-get install -y git

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and possibly package-lock.json files to the working directory
COPY package*.json ./

# Clear Yarn cache
RUN yarn cache clean

# Install the dependencies using Yarn
RUN yarn install


# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the application will use
EXPOSE 3000

# Set the environment variables
ENV NODE_ENV=development
ENV PORT=3000

# Run the command to start the application using Yarn
CMD ["yarn", "start"]
