# Build and run

## Technology Stack

The software tools and technologies used to build the DTS web application. This includes programming languages, frameworks, libraries, patterns, servers, UI/UX solutions, software, and tools used by developers.

* TypeScript
* Node (version 22)
* React
* Remix
* Drizzle ORM
* PostgreSQL (version 16 with PostGIS add-on)

## Purpose

This branch implements a **Proof of Concept (POC)** for **real-time data updates** in the dashboard using WebSocket. The primary goal is to explore the feasibility and benefits of real-time communication for the DTS web application.

### Key use cases:
1. **Real-time updates** for the dashboard in scenarios such as global instances involving multiple countries and frequent data changes.
2. Enhanced user experience by eliminating the need for manual page refreshes to fetch updated data.

**Note:** This POC is not intended for the current "country instance." It will only be used in scenarios requiring real-time data updates.

## WebSocket Implementation Overview

1. **WebSocket Server**
   - Located in `websocket.server.ts`, the WebSocket server listens for connections from the client.
   - Sends updated data periodically using the `setInterval()` function.
   - Fetches data from the database using Drizzle ORM and emits updates to connected clients.

2. **WebSocket Client Integration**
   - The client establishes a WebSocket connection in the `DisasterSummary.tsx` component.
   - Listens for incoming messages to update charts and statistics dynamically without refreshing the page.

3. **Dashboard Updates**
   - Charts and statistics on the dashboard are updated in real-time as data changes are emitted from the WebSocket server.

## Running locally

### Manual

#### Install PostgreSQL

#### Configure application

Copy example.env to .env and adjust the options.

#### Build and run
```
npm install --global yarn
yarn install
yarn run drizzle-kit push
yarn run dev
```

#### Run tests
```
yarn run dotenv -e .env.test drizzle-kit push
yarn run test
```

## Admin Setup

* Setup the admin account: http://localhost:3000/setup/admin-account-welcome
* Import HIPs taxonomy: http://localhost:3000/setup/import-hip
