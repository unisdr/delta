# DELTA Resilience (**D**isaster & Hazardous **E**vents, **L**osses and Damages **T**racking & **A**nalysis)

DELTA Resilience is a comprehensive system, not just an open-source software. Co-developed with data producers and users and building on DesInventar Sendai, DELTA brings together:

* Methodological frameworks
* Data standards and governance,
* Capacity development and technical assistance,
* Open-source software

It supports nationally owned Disaster Tracking Systems to monitor hazardous events and record losses and damages at national and subnational levels—whether countries use the DELTA Resilience software interface or strengthen their existing national platforms.

Visit the [project website for more details](https://www.undrr.org/building-risk-knowledge/disaster-losses-and-damages-tracking-system-delta-resilience).

## Features

- Create, edit and publish hazardous events, disaster events and disaster records
- Geospatial footprints
- Import tools for legacy datasets (DesInventar using [DIX - DesInventar eXchange](https://github.com/unisdr/dts-import-middleware))
- Role based access


## Technology stack
- TypeScript
- Node.js (v22 recommended)
- Remix (React)
- Drizzle ORM
- PostgreSQL 16 + PostGIS


## Project structure

Below is a view of the repository layout and the purpose of key folders/files to help new contributors navigate the codebase.
 

```
├── app/                       # Remix app source (routes, components, backend.server code)
│   ├── backend.server/        # Server-side API handlers and models
│   ├── frontend/              # Shared frontend components and views
│   ├── routes/                # Remix route modules
│   ├── db/                    # DB helpers
│   └── ...
├── build/                     # Build output (client/server bundles)
├── dts/                       # Primary app folder (this folder contains many app-level resources)
│   ├── docker-compose.yml
│   ├── Dockerfile.app
│   ├── package.json
│   ├── server.js
│   ├── vite.config.ts
│   └── _docs/                 # Developer docs and design docs
├── dts_shared_binary/         # Binary and helper scripts for deployments
├── scripts/                   # Database init, build and deployment scripts
├── public/                    # Static assets served by the app
│   └── assets/
├── uploads/                   # Uploaded files storage
├── logs/                      # Application logs
├── example.env                # Example environment variables
└── start.sh                   # Launch helper for local/dev
```

 

Notes:

- The `app/` directory contains the bulk of the application code (Remix routes, frontend components, and server models).

- `_docs/` and `dts/_docs/` contain developer and design documentation — consult these before contributing.

- `scripts/` includes db schema and initialization scripts used in CI/deploy flows.

- `public/` contains static front-end assets and theme files.

 
## Quick start (local development)
Prerequisites:
- Node.js (22.x recommended)
- Yarn (or use npm)
- PostgreSQL 16 with PostGIS
 
1. Clone the repository
```bash
    git clone https://github.com/unisdr/delta.git
    cd delta
```

2. Install dependencies
 
```bash
yarn install
```
 
3. Copy example env and configure
 
```bash
cp example.env .env
# edit .env and set DATABASE_URL, SESSION_SECRET, EMAIL config, etc.
```
 
4. Apply database schema (drizzle)
 
```bash
yarn run dbsync
```
 
5. Run in development mode
 
```bash
yarn run dev
```
 
Open http://localhost:3000.
 
Follow this [full guide](_docs/installation/shared-instance-installation.md) or [continue with the admin setup](_docs/installation/shared-instance-installation.md#4-super-admin-setup).
 
### Environment variables
Copy `example.env` to `.env` and update values. Key variables:
 
- DATABASE_URL (required): Postgres connection string. Example: `postgresql://user:pass@localhost:5432/dts?schema=public`
- SESSION_SECRET (required): long random string for session signing
- EMAIL_TRANSPORT: `smtp` or `file` (file is useful for dev)
- EMAIL_FROM: default sender address for outgoing emails
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE: SMTP settings when EMAIL_TRANSPORT=smtp
- AUTHENTICATION_SUPPORTED: `form`, `sso_azure_b2c`, or comma-separated values
- SSO_AZURE_B2C_*: configuration for Azure B2C SSO when used
Security notes:
- Never commit `.env` to source control. Use a secrets manager for production.
 
### Database
- Uses PostgreSQL 16 with PostGIS. Create your DB and enable PostGIS extensions before applying migrations.
- Apply migrations using drizzle-kit: `yarn dbsync`.
- Backup and restore: use `pg_dump`/`pg_restore` for database backups; ensure PostGIS types are preserved.
 
### Testing
- Run unit and integration tests with Jest (or the configured test runner):
 
```bash
yarn run dotenv -e .env.test drizzle-kit push
yarn run test
```

### Useful commands
 
- Install dependencies: `yarn install`
- Run dev: `yarn run dev`
- Apply migrations: `yarn run dbsync`
- Run tests: `yarn run test`
- Build production artifact: `yarn run build`

## Production deployment (recommendations)
- Use a managed Postgres (RDS, Cloud SQL, Azure DB) or a highly available Postgres cluster
- Use Docker or Kubernetes for deployment. Store secrets in a vault or orchestrator secrets store
- Terminate TLS at the load balancer / ingress and enable secure cookies and HSTS
- Configure monitoring (logs, metrics, Sentry for errors)
- Use a CDN for static assets if serving at scale
 
### Minimal production checklist:
- Strong `SESSION_SECRET` and secure storage of DB credentials
- HTTPS enabled
- Backups and monitoring configured
 
### Security & secrets
- Set `SESSION_SECRET` to a secure, randomly generated value
- Use environment-based secret management (Vault, cloud secrets manager)
- Validate and sanitize uploads; enforce limits on attachment sizes
- Change the default password


## Contributing

We are currently in active development phase and anticipate making significant changes to the project. To help maintain stability, we kindly ask contributors to focus on:

- Bug fixes
- Documentation improvements
- Minor improvements

Before contributing, please follow the conventions outlined in `_docs/code-structure/code-structure.md` and related documentation. This helps ensure consistency and maintainability across the codebase.

At this time, we are not accepting large features or major refactors. This temporary policy helps ensure the codebase remains stable and maintainable. We will revisit and update these guidelines as the project evolves.

Thank you for your interest in contributing.


### Licensing Note

All development contributions must comply with the Apache License 2.0. By submitting a contribution, you agree to license your work under these terms.




