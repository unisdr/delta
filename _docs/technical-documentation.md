# Version History

| Version | Date (YYYY-MM-DD) | Author        | Description                                       |
| ------- | ----------------- | ------------- | ------------------------------------------------- |
| 1.0     | 2025-01-08        | Haroon Nasher | Initial draft of the DTS technical documentation. |

---

## Minimum System Requirements and Deployment Guidelines

    These are the minimum system requirements and deployment guidelines for installing DTS on a server. If your device does not meet these requirements, you may need to upgrade your hardware or consider purchasing a new server.

### 1. System Requirements

#### a. Hardware Requirements:

  1. Processor: Minimum 4-core CPU
  2. RAM: 8GB RAM
  3. Storage: 100GB storage or larger storage device

#### b. Operating Systems:

    Supported platforms: Windows, Linux

#### c. Browser Compatibility:

    Modern web browsers like Chrome, Firefox, or Edge

---

### 2. Deployment

    DTS system can be of two types:
    1. Packaged as Docker containers, making it portable and straightforward to deploy on any infrastructure that supports Docker.
    2. Zipped file, which can be unzipped on your own server of selection.

---

### 3. Installation Types

    DTS offers two deployment options:

- **Docker container:** Packaged as Docker containers, making it portable and straightforward to deploy on any infrastructure that supports Docker.
- **Zipped file:** Hosted and managed by the country’s local infrastructure.

---

### 4. Installing DTS as Country Instance

1. Clone the repo with the command 'git clone git@github.com:unisdr/dts-deployment-unog.git'. The folder name for this repository must be "dts-deployment-unog".
```bash
git clone git@github.com:unisdr/dts-deployment-unog.git
```
2. Build the container images by running 'docker-compose build'.
```bash
docker-compose build
```
3. Build the production code artifact by running './build.sh'.
```bash
./build.sh
```
4. Create the environment variables from file example.env to .env.
```bash
cp ./example.env ./.env
```
5. Update the database by running './db-update.sh'.
```bash
./db-update.sh
```
## Application runs on port 3004
* http://localhost:3004
---

### 5. Installing DTS as UNDRR Instance

(To be added.)

---

### 6. Open-Source Technology Stack & Reference

#### a. Backend Technologies:

1. Programming Language: [Node.js](https://nodejs.org/en)
2. Framework: [Remix](https://remix.run/)
3. Database: [PostgreSQL](https://www.postgresql.org/) for relational data management with [PostGIS](https://postgis.net/)

#### b. Frontend Technologies:

1. Framework/library: [React](https://react.dev/)
2. Styling tools

#### c. APIs and Integrations:

1. RESTful API, SFM

#### d. Containerization:

1. [Docker](https://www.docker.com/)

#### e. Icons:

1. Icons coming from Mangrove
2. Icons coming from PreventionWeb site
3. Icons coming from fontawesome site
4. Icons coming from [react-icons](https://react-icons.github.io/react-icons/)

---

### 7. System Architecture

#### a. Application Architecture:

(To be added.)

#### b. Data Flow:

(To be added.)

#### c. Security Features:

1. Authentication methods (e.g., OAuth2, JWT)

---

---

### 8. Support and Documentation

    The support and maintenance will be provided in-house for the **UNDRR instance** and for the shared code base available for all countries.  
    For country-specific needs, a self-help website will be set up with:

- Code sharing
- Comprehensive user manuals

### 9. FAQ