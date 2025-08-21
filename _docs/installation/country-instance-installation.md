# DTS Project Technical Documentation

## Version History

| Version | Date (YYYY-MM-DD) | Author        | Description                                                                  |
| ------- | ----------------- | ------------- | ---------------------------------------------------------------------------- |
| 2.1     | 2025-08-11        | Dieka Jr.     | Updated repository URLs and project structure. Fixed incorrect GitHub repository reference and added proper checkout instructions. |
| 2.0     | 2025-05-26        | Dieka Jr.     | Comprehensive update with detailed installation guide and troubleshooting.  |
| 1.0     | 2025-01-08        | Haroon Nasher | Initial draft of the DTS technical documentation.                           |

---

## 1. Overview

The DTS Project is a web application designed for efficient data collection, visualization, and management with secure user access controls. It provides an intuitive interface accessible through modern web browsers and serves as a digital workspace for data-driven operations.

### Key Features
- Efficient data collection capabilities
- Clear data visualization tools
- Secure user access management
- Intuitive web-based interface
- Geographic data support with PostGIS integration

---

## 2. System Architecture

### High-Level Architecture (C4 Model - Level 1)

The DTS system follows a modern web application architecture with the following components:

- **User Interface Layer**: Web browsers (Chrome, Firefox, Edge)
- **Application Layer**: React + Remix + TypeScript web application
- **Runtime Environment**: Node.js v22
- **Data Layer**: PostgreSQL 16 with PostGIS extension
- **Package Management**: Yarn for dependency management
- **Database Management**: Drizzle ORM for database operations

### Container Architecture (C4 Model - Level 2)

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Computer                          │
├─────────────────────────────────────────────────────────────┤
│ User Layer:        Web Browser Interface                    │
├─────────────────────────────────────────────────────────────┤
│ Application Layer: React + Remix + TypeScript Web App       │
│                   Node.js Runtime Environment               │
├─────────────────────────────────────────────────────────────┤
│ Data Layer:       PostgreSQL 16 + PostGIS Database          │
├─────────────────────────────────────────────────────────────┤
│ Tools Layer:      Yarn Package Manager                      │
│                   Drizzle ORM                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. System Requirements

### Minimum Requirements

| Component           | Specification                                    |
| ------------------- | ------------------------------------------------ |
| **Operating System** | Windows 10, macOS 10.15, or Ubuntu 18.04      |
| **Processor**       | 4-core CPU minimum                              |
| **Memory (RAM)**    | 8GB minimum                                     |
| **Storage**         | 100GB free space minimum                       |
| **Internet**        | Stable broadband connection                     |
| **Browser**         | Chrome 90+, Firefox 88+, Edge 90+              |

### Recommended Requirements

| Component           | Specification                                    |
| ------------------- | ------------------------------------------------ |
| **Operating System** | Windows 11, macOS 12+, or Ubuntu 20.04+       |
| **Processor**       | Multi-core CPU (6+ cores recommended)          |
| **Memory (RAM)**    | 16GB or more                                    |
| **Storage**         | 200GB+ SSD storage                              |
| **Internet**        | High-speed broadband                            |
| **Browser**         | Latest version of any modern browser            |

### Additional Requirements
- Administrator/admin rights on the installation computer
- Ability to temporarily disable antivirus software if needed
- 2-3 hours available for complete installation
- Stable internet connection throughout installation

---

## 4. Technology Stack

### Backend Technologies

| Component                | Technology                                      | Version |
| ------------------------ | ----------------------------------------------- | ------- |
| **Runtime Environment** | [Node.js](https://nodejs.org/en)               | v22.x   |
| **Web Framework**       | [Remix](https://remix.run/)                    | Latest  |
| **Database**            | [PostgreSQL](https://www.postgresql.org/)      | v16     |
| **Geographic Extension**| [PostGIS](https://postgis.net/)                | v3      |
| **ORM**                 | Drizzle                                         | Latest  |
| **Package Manager**     | Yarn                                            | Latest  |

### Frontend Technologies

| Component          | Technology                                      | Version |
| ------------------ | ----------------------------------------------- | ------- |
| **UI Framework**   | [React](https://react.dev/)                    | Latest  |
| **Language**       | TypeScript                                      | Latest  |
| **Styling**        | CSS                                             | Latest  |
| **Icons**          | Various sources (react-icons, FontAwesome)     | Latest  |

### Development Tools

| Component              | Technology                                   | Purpose                    |
| ---------------------- | -------------------------------------------- | -------------------------- |
| **Version Control**    | [Git](https://git-scm.com)                  | Source code management     |
| **Containerization**   | [Docker](https://www.docker.com/)           | Deployment packaging       |
| **Database Admin**     | pgAdmin 4                                    | Database management        |

---

## 5. Installation Types and Deployment Options

The DTS system supports multiple deployment methods to accommodate different infrastructure needs:

### 5.1 Development Installation (Local)

**Purpose**: Individual development and testing
**Requirements**: Local machine with required dependencies
**Access**: http://localhost:3000
**Installation Time**: 2-3 hours

### 5.2 Docker Container Deployment

**Purpose**: Production deployment with containerization
**Requirements**: Docker and Docker Compose
**Access**: http://localhost:3004
**Benefits**: 
- Portable across different infrastructures
- Consistent deployment environment
- Easy scaling and management

### 5.3 Country Instance Deployment

**Purpose**: Country-specific deployments with local infrastructure management
**Requirements**: Server infrastructure, Git access
**Benefits**:
- Local control and customization
- Country-specific configurations
- Direct infrastructure management

---

## 6. Installation Procedures

### 6.1 Development Installation

#### Prerequisites Installation

1. **Install Node.js v22**
   ```bash
   # Verify installation
   node --version  # Should show v22.x.x
   npm --version   # Should show 10.x.x or similar
   ```

2. **Install PostgreSQL 16 with PostGIS**
   - Download and install PostgreSQL 16 from [official website](https://www.postgresql.org/download/)
   - During installation, select the PostGIS extension when prompted
   ```bash
   # Verify PostgreSQL installation
   psql --version  # Should show PostgreSQL 16.x
   
   # Verify or install PostGIS extension
   # Connect to your database and run:
   CREATE EXTENSION IF NOT EXISTS postgis;
   
   # Verify PostGIS installation
   SELECT PostGIS_Version();
   ```

3. **Install Git**
   ```bash
   # Verify installation
   git --version  # Should show git version 2.x.x
   ```

#### Project Setup

1. **Download DTS Project**
   ```bash
   # Method A: Git clone
   git clone https://github.com/unisdr/dts.git DTS-Project
   cd DTS-Project
   git checkout dev
   
   # Method B: Download ZIP and extract to DTS-Project folder
   ```

2. **Configure Environment**
   ```bash
   # Copy environment template
   cp example.env .env
   ```
   
   Edit the `.env` file with appropriate values. Below is a comprehensive list of environment variables:
   
   | Variable | Required | Default | Description |
   |----------|----------|---------|-------------|
   | DATABASE_URL | Yes | - | PostgreSQL connection string |
   | PORT | No | 3000 | Port for the application server |
   | NODE_ENV | No | development | Environment (development, production, test) |
   | ADMIN_EMAIL | No | - | Initial admin account email |
   | ADMIN_PASSWORD | No | - | Initial admin account password |
   | SMTP_HOST | No | - | SMTP server for email notifications |
   | SMTP_PORT | No | 587 | SMTP port |
   | SMTP_USER | No | - | SMTP username |
   | SMTP_PASSWORD | No | - | SMTP password |
   | SESSION_SECRET | Yes | - | Secret for session encryption |
   
   Example configuration:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/dts_project"
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET="your-secure-session-secret"
   ```

3. **Create Database and Enable PostGIS**
   ```sql
   -- Using psql or pgAdmin
   CREATE DATABASE dts_project;
   
   -- Connect to the new database
   \c dts_project
   
   -- Enable PostGIS extension
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

4. **Install Dependencies**
   ```bash
   # Install Yarn globally
   npm install --global yarn
   
   # Install project dependencies
   yarn install
   
   # Setup database structure
   yarn run drizzle-kit push
   ```

5. **Start Application**
   ```bash
   yarn run dev
   # Access at http://localhost:3000
   ```

6. **Initial Admin Account Setup**
   - Navigate to http://localhost:3000/setup/admin-account-welcome
   - Follow the on-screen instructions to create your first admin account
   - If the setup page is not available, you can set admin credentials via environment variables:
   ```
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="securepassword"
   ```

### 6.2 Docker Container Deployment

#### Installing DTS as Country Instance

1. **Clone Repository**
   ```bash
   git clone https://github.com/unisdr/dts.git
   cd dts
   git checkout dev
   ```

2. **Build Container Images**
   ```bash
   docker-compose build
   ```

3. **Build Production Code**
   ```bash
   ./build.sh
   ```

4. **Configure Environment**
   ```bash
   cp ./example.env ./.env
   # Edit .env file with appropriate values
   ```

5. **Update Database**
   ```bash
   ./db-update.sh
   ```

6. **Access Application**
   - Application runs on port 3004
   - Access at http://localhost:3004

---

## 7. Security Features

### Authentication Methods
- **JWT (JSON Web Tokens)** for secure session management
- **OAuth2** integration capabilities for third-party authentication
- Role-based access control (RBAC)
- Secure password handling with encryption

### Database Security
- **PostgreSQL security features** including user privileges and access controls
- **Encrypted connections** between application and database
- **SQL injection prevention** through parameterized queries via Drizzle ORM

### Network Security
- **HTTPS support** for production deployments
- **CORS (Cross-Origin Resource Sharing)** configuration
- **Environment variable protection** for sensitive configuration data

---

## 8. API and Integration Capabilities

### RESTful API
- **Standardized REST endpoints** for data operations
- **JSON data format** for request/response payloads
- **HTTP status codes** for proper error handling
- **API versioning** support for backward compatibility

### External Integrations
- **SFM (Sendai Framework Monitor)** integration capabilities
- **Geographic data services** through PostGIS
- **Third-party authentication providers**
- **Data export/import** functionality

---

## 9. Maintenance and Operations

### Daily Operations

#### Starting the Application
```bash
# Navigate to project directory
cd path/to/DTS-Project

# Start development server
yarn run dev

# Or for production (Docker)
docker-compose up -d
```

#### Stopping the Application
```bash
# Development server
Ctrl + C  # In terminal where yarn run dev is running

# Docker deployment
docker-compose down
```

### Recommended Maintenance Tasks

Below are recommended maintenance tasks that should be performed according to your organization's operational procedures and requirements.

#### System Updates
- Check for system updates
- Update Node.js for security patches
- Check for DTS Project updates

#### Data Management
- Backup important data
- Backup PostgreSQL database:
  ```bash
  pg_dump -U postgres dts_project > backup_$(date +%Y%m%d).sql
  ```
- Review and clean up log files

#### Performance Maintenance
- Monitor disk space usage
- Clear browser cache if performance issues occur
- Full system backup and recovery testing
- Security settings review
- Performance optimization review

### Database Backup and Recovery

#### Backup Procedures
```bash
# Create database backup
pg_dump -U postgres -h localhost -d dts_project > dts_backup.sql

# Create compressed backup
pg_dump -U postgres -h localhost -d dts_project | gzip > dts_backup.sql.gz
```

#### Recovery Procedures
```bash
# Restore from backup
psql -U postgres -h localhost -d dts_project < dts_backup.sql

# Restore from compressed backup
gunzip -c dts_backup.sql.gz | psql -U postgres -h localhost -d dts_project
```

---

## 10. Troubleshooting

For troubleshooting assistance, please refer to the FAQ section below. The FAQ includes solutions to common installation and operational issues.

---

## 11. Support and Documentation

### Support Structure

#### Country Instance Support
- **Self-help resources** available
- **Community support** through shared documentation
- **Country-specific customization** guidance

### Documentation Resources

#### Technical Documentation
- **Installation guides** (this document)
- **API documentation** for developers
- **Database schema** documentation *(in development - will be available in future updates)*
- **Configuration reference** guides

#### User Documentation
- **User manuals** for end-users
- **Training materials** for administrators
- **Best practices** guides
- **FAQ sections** for common questions

### Getting Help

#### Self-Help Resources
1. Check troubleshooting section in this document
2. Review error messages for specific solutions
3. Search project GitHub issues for known problems
4. Consult community documentation

#### Support Contact Process
**When contacting support, provide:**
- System information (OS, versions, hardware specs)
- Exact error messages with screenshots
- Steps that led to the issue
- Previous troubleshooting attempts
- DTS Project version information

---

## 12. Version Management and Updates

### Version Numbering
The DTS Project follows semantic versioning (SemVer):
- **Major.Minor.Patch** format (e.g., 0.0.7)
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

### Update Procedures

#### Development Environment Updates
```bash
# Check current version
node --version
yarn --version

# Update project dependencies
yarn install

# Update database schema if needed
yarn run drizzle-kit push
```

#### Production Environment Updates
1. **Backup current installation**
2. **Test updates in staging environment**
3. **Schedule maintenance window**
4. **Apply updates with rollback plan**
5. **Verify functionality post-update**

---

## 13. FAQ

### General Questions

**Q: What is the DTS Project?**
A: DTS is a web application for data collection, visualization, and management with secure user access controls.

**Q: What browsers are supported?**
A: Modern browsers including Chrome 90+, Firefox 88+, and Edge 90+.

**Q: Can DTS run on mobile devices?**
A: Yes, DTS is web-based and responsive, working on tablets and mobile browsers.

### Installation Questions

**Q: How long does installation take?**
A: Complete installation typically takes 2-3 hours for new installations.

**Q: Do I need administrator rights?**
A: Yes, administrator privileges are required for installing system components.

**Q: Can I install DTS on a shared server?**
A: Yes, both Docker and direct installation methods support server deployment.

### Technical Questions

**Q: What database does DTS use?**
A: PostgreSQL 16 with PostGIS extension for geographic data support.

**Q: Is DTS open source?**
A: Yes, DTS uses open-source technologies and provides source code access.

**Q: Can DTS integrate with other systems?**
A: Yes, DTS provides RESTful APIs and supports various integration methods.

### Troubleshooting Questions

**Q: Application won't start after installation?**
A: Check that all services (PostgreSQL, Node.js) are running and ports are available.

**Q: Database connection errors?**
A: Verify PostgreSQL service is running and credentials in .env file are correct. Check that the PostgreSQL service is running and that port 5432 is available.

**Q: How do I backup my data?**
A: Use pg_dump for database backups and backup configuration files regularly.

**Q: I get 'node' is not recognized as an internal or external command**
A: Reinstall Node.js with "Add to PATH" option, manually add Node.js to system PATH, or restart your terminal/command prompt.

**Q: I get 'Error: listen EADDRINUSE: address already in use :::3000'**
A: Another process is using port 3000. Find and kill the process or use an alternative port:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Mac/Linux
lsof -i :3000
kill -9 [PID]

# Or use alternative port
PORT=3001 yarn run dev
```

**Q: The application is running slowly**
A: Check system resource usage, optimize database queries, clear browser cache, or restart the application.

**Q: Database queries are slow or timing out**
A: Monitor database connections, optimize database indexes, perform regular maintenance (VACUUM, ANALYZE), and check PostgreSQL logs for slow queries.

**Q: How do I perform a complete system reset?**
A: 1) Backup your data, 2) Uninstall components (Node.js, PostgreSQL, Git), 3) Follow the installation guide from the beginning, and 4) Restore your data.

---

## 14. Appendices

### Appendix A: Command Reference

#### Essential Commands
```bash
# Version checks
node --version
npm --version
git --version
yarn --version

# Project operations
yarn install           # Install dependencies
yarn run dev          # Start development server
yarn run build        # Build for production
yarn run drizzle-kit push  # Update database schema

# Database operations
psql -U postgres      # Connect to PostgreSQL
pg_dump -U postgres dts_project > backup.sql  # Backup database
```

### Appendix B: Port Reference

| Service           | Default Port | Purpose                    |
| ----------------- | ------------ | -------------------------- |
| DTS Development   | 3000         | Local development server   |
| DTS Production    | 3004         | Docker container deployment |
| PostgreSQL        | 5432         | Database server            |
| pgAdmin           | 5050         | Database administration    |

### Appendix C: File Structure Reference

```
dts/
├── app/                      # Source code
│   ├── backend.server/       # Server-side code
│   │   ├── handlers/        # Request handlers
│   │   └── models/          # Database models
│   ├── drizzle/             # Database schema
│   ├── frontend/            # React components
│   ├── routes/              # Remix routes
│   └── types/               # TypeScript types
├── public/                   # Static assets
├── _docs/                    # Documentation
│   └── installation/         # Installation guides
├── information-pages-override/ # Custom content files for overriding default content
├── package.json              # Project configuration
├── .env                      # Environment variables
├── example.env               # Environment template
├── docker-compose.yml        # Docker configuration
└── README.md                # Basic project information
```

> Note: The "information-pages-override" directory contains custom markdown files that can be used to override default content in the application. This allows for country-specific customization without modifying the core codebase.

---

*This document serves as the comprehensive technical reference for the DTS Project. For the latest updates and additional resources, please refer to the project repository and official documentation channels.*