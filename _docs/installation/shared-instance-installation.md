# DELTA Resilience Shared Instance Installation Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Super Admin Setup](#super-admin-setup)
5. [Country Account Management](#country-account-management)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

---

## 1. Overview

The DELTA Resilience Shared Instance uses a **Single Database Multi-Tenancy** architecture that allows multiple countries to share the same infrastructure while maintaining strict data sovereignty and security controls. This installation guide covers the setup process for system administrators and technical consultants.

### Key Features

- Single application serving multiple country instances
- Shared PostgreSQL database with tenant isolation
- Role-based access control with super admin capabilities
- Support for both Official and Training country accounts

---

## 2. Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Docker environment
- **CPU**: 4+ cores recommended
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 100GB minimum SSD storage
- **Network**: Stable internet connection

### Software Dependencies

#### Option A: Docker Deployment (Recommended)

- **Docker & Docker Compose**: Latest versions (for containerized deployment)
- **Git**: For source code management

#### Option B: Manual Installation

- **Node.js**: v22.x
- **PostgreSQL**: v16 with PostGIS extension
- **Git**: For source code management
- **Yarn**: Package manager

---

## 3. Installation Steps

### Option A: Docker Deployment (Recommended)

1. **Clone the Shared Instance Repository**

   ```bash
   git clone https://github.com/unisdr/dts-shared-instance.git
   cd dts-shared-instance
   ```

2. **Configure Environment Variables**

   ```bash
   cp example.env .env
   ```

3. **Edit the `.env` file with the following configuration:**

   > **Note**: Many configuration variables have been moved to the database (`instance_system_settings` table) and are no longer needed in `.env`. Only infrastructure and security-related variables remain in `.env`.

   ### 2.2 Environment Variables

   Create a `.env` file in the project root with **only infrastructure-related variables**. Many configuration settings that were previously in `.env` have been moved to the database and are now managed through the super admin interface.

   #### Required Environment Variables (.env file)

   ```bash
   # Database Configuration (Required in .env)
   DATABASE_URL="postgresql://username:password@localhost:5432/dts_shared"

   # Authentication & Security (Required in .env)
   SESSION_SECRET="your-secure-random-string"

   # Email Configuration (Required in .env)
   EMAIL_TRANSPORT="smtp"
   EMAIL_FROM="noreply@your-domain.com"
   SMTP_HOST="your-smtp-server.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="your-smtp-username"
   SMTP_PASS="your-smtp-password"

   # Authentication (Required in .env)
   AUTHENTICATION_SUPPORTED="form,sso_azure_b2c"

   # SSO Configuration (if using Azure B2C)
   # SSO_AZURE_B2C_TENANT=""
   # SSO_AZURE_B2C_CLIENT_ID=""
   # SSO_AZURE_B2C_CLIENT_SECRET=""
   # SSO_AZURE_B2C_USERFLOW_LOGIN=""
   # SSO_AZURE_B2C_USERFLOW_LOGIN_ADMIN_REDIRECT_URL=""
   # SSO_AZURE_B2C_USERFLOW_LOGIN_REDIRECT_URL=""
   # SSO_AZURE_B2C_USERFLOW_EDIT=""
   # SSO_AZURE_B2C_USERFLOW_EDIT_REDIRECT_URL=""
   # SSO_AZURE_B2C_USERFLOW_RESET=""
   # SSO_AZURE_B2C_USERFLOW_RESET_REDIRECT_URL=""

   # Application Environment
   NODE_ENV="development"  # Use "production" for production environment.


   ```

   #### Configuration Moved to Database

   The following settings are now managed through the database (`instance_system_settings` table) and can be configured via the super admin interface after installation:

   - `WEBSITE_LOGO` → `instance_system_settings.website_logo`
   - `WEBSITE_NAME` → `instance_system_settings.website_name`
   - `APPROVED_RECORDS_ARE_PUBLIC` → `instance_system_settings.approved_records_are_public`
   - `TOTP_ISSUER` → `instance_system_settings.totp_issuer`
   - `DTS_INSTANCE_TYPE` → `instance_system_settings.dts_instance_type`
   - `DTS_INSTANCE_CTRY_ISO3` → `instance_system_settings.dts_instance_ctry_iso3`
   - `CURRENCY_CODE` → `instance_system_settings.currency_code`
   - Footer URLs (privacy policy, terms & conditions)
   - Admin setup status

   > **Important**: These settings should NOT be included in the `.env` file as they are now managed through the database.

4. **Build and Start the Application**

   ```bash
   # Build the Docker images
   docker-compose build

   # Start the services
   docker-compose up -d

   # Initialize the Database Schema and Run Migrations
   docker-compose exec app yarn dbsync
   ```

   > Note: This command runs both `drizzle-kit push` to load the schema and `drizzle-kit migrate` to execute migration scripts. Using only `drizzle-kit push` is insufficient as it only loads the schema without running migrations.

### Option B: Manual Installation

1. **Install Dependencies**

   ```bash
   # Install Node.js v22
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PostgreSQL 16 with PostGIS
   sudo apt-get install -y postgresql-16 postgresql-16-postgis-3

   # Install Yarn
   npm install -g yarn
   ```

2. **Setup Database**

   ```bash
   sudo -u postgres createdb dts_shared
   sudo -u postgres psql -d dts_shared -c "CREATE EXTENSION postgis;"
   sudo -u postgres psql -d dts_shared -c " CREATE EXTENSION IF NOT EXISTS pgcrypto"
   ```

3. **Clone and Setup Application**

   ```bash
   git clone https://github.com/unisdr/dts-shared-instance.git
   cd dts-shared-instance
   yarn install
   cp example.env .env
   # Edit .env file with infrastructure variables only (see Docker section above)
   yarn dbsync
   ```

4. **Start the Application**

   **For Production:**

   ```bash
   yarn run build  # Builds the application using Remix and Vite for production
   yarn run start  # Starts the application server
   ```

   **For Development:**

   ```bash
   yarn dev  # Starts the application in development mode with hot reloading
   ```

   > Note: The `yarn run build` step is only necessary when deploying for production as it compiles and optimizes the application. For development environments, use `yarn dev` which provides hot reloading and better debugging capabilities.

---

## 4. Super Admin Setup

### 4.1 Super Admin Default

An account is created by default with user name admin@admin.com and password pvDT0g8Qsa36

### 4.2 Update Super Admin Password

```bash
   docker-compose exec psql -U postgres -d dts_development -c "UPDATE public.super_admin_users
SET password = crypt('your_password_here', gen_salt('bf', 10))
WHERE email = 'admin@admin.com';"
```

### 4.3 Super Admin Login

1. **Access the application** at your configured URL (e.g., `http://localhost:3000` or your domain)

2. **Navigate to the admin login page** (`/admin/login`)

   > **Important**: Super admins must use the dedicated admin login page at `/admin/login`, not the regular user login page.

3. **Enter the super admin credentials:**

   - **Email**: `admin@admin.com`
   - **Password**: The password you set in the previous step or the default pvDT0g8Qsa36

4. **Upon successful login**, you will be redirected to the country accounts management page (`/admin/country-accounts`).

   > **Important**: The super admin role is strictly limited to country account management functions only. Super admins cannot access other system settings or features.

   As a super admin, you can:

   - View a list of all countries in the system
   - Create new country accounts
   - Modify only the short description and status (active/inactive) of existing country accounts
   - Assign primary administrators when creating country accounts

5. **After completing country account management tasks**, use the logout option to exit the system.

## 5. Country Account Management

Once logged in as super admin, you can manage country accounts:

### 5.1 Creating Country Accounts

1. **Navigate to Country Accounts** (`/admin/country-accounts`)
2. **Click "Add Country Account"**
3. **Fill in the required information:**
   - **Country**: Select from the dropdown
   - **Status**: Active/Inactive
   - **Type**: Official/Training
   - **Admin Email**: Email for the country's primary administrator
   - **Short Description**: Optional description for the country account
4. **Save** the account

The system will automatically:

- Create a country account with the specified settings
- Generate a primary admin user for the country
- Send an invitation email to the admin
- Configure instance system settings for the country

### 5.2 Managing Existing Accounts

- **View all country accounts** in the management table
- **Edit account status** (Active/Inactive)
- **View country-specific information**
- **Monitor account creation and modification dates**

---

## 6. Configuration

### 6.1 Database-Stored Configuration

Most application settings are now stored in the database rather than environment variables. These can be configured through the super admin interface:

#### 6.1.1 System-Wide Settings (instance_system_settings table)

After logging in as super admin, navigate to **System Settings** to configure:

**Application Branding:**

- **Website Logo** (`website_logo`): URL or path to logo image
- **Website Name** (`website_name`): Display name for the application
- **Website URL** (`website_url`): Base URL for the application

**Instance Configuration:**

- **Instance Type** (`dts_instance_type`): Set to "shared" for multi-tenant
- **Country ISO3** (`dts_instance_ctry_iso3`): Default country code
- **Currency Codes** (`currency_codes`): Comma-separated list (e.g., "CDF,YER,PHP")

**Security & Privacy:**

- **TOTP Issuer** (`totp_issuer`): Name shown in authenticator apps
- **Approved Records Public** (`approved_records_are_public`): Boolean for public visibility
- **Footer URLs**: Privacy policy and terms & conditions links

**Database Configuration Commands:**

```sql
-- View current settings
SELECT * FROM instance_system_settings;

-- Update specific settings (example)
UPDATE instance_system_settings
SET
    website_name = 'DELTA Resilience Shared Instance',
    website_logo = '/assets/shared-instance-logo.png',
    dts_instance_type = 'shared',
    totp_issuer = 'DELTA Resilience Shared System',
    approved_records_are_public = false
WHERE id = 'your-settings-id';
```

### 6.2 Environment Variables (.env)

Only infrastructure and security variables remain in `.env`:

```ini
# Required Infrastructure Variables
DATABASE_URL="postgresql://user:pass@host:port/db"
SESSION_SECRET="secure-random-string"
NODE_ENV="development"
PORT=3000

# Required Email Configuration
EMAIL_TRANSPORT="smtp"
EMAIL_FROM="noreply@domain.com"
SMTP_HOST="smtp.domain.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="username"
SMTP_PASS="password"

# Required Authentication
AUTHENTICATION_SUPPORTED="form"

# Optional SSO Configuration
# SSO_AZURE_B2C_* variables (if using Azure B2C)
```

### 6.3 Country-Specific Settings

Each country account has its own configuration stored in the database:

- **Instance system settings** linked to country accounts
- **Website branding** (logo, name) per country
- **Privacy and terms URLs** per country
- **Currency settings** per country
- **Public record visibility** per country
- **TOTP issuer configuration** per country

These are automatically created when a country account is established and can be managed through the country-specific admin interface.

---

## 7. Troubleshooting

### 7.1 Super Admin Login Issues

**Problem**: Cannot log in with super admin credentials

**Solutions**:

1. **Verify the user exists in the database:**

   ```sql
   SELECT email, role, is_super_admin FROM users WHERE email = 'superadmin@your-domain.com';
   ```

2. **Reset the password using the script method above**

3. **Check application logs:**

   ```bash
   # Docker deployment
   docker-compose logs app

   # Manual installation
   journalctl -u dts-app -f
   ```

### 7.2 Database Connection Issues

**Problem**: Application cannot connect to database

**Solutions**:

1. **Verify PostgreSQL is running:**

   ```bash
   sudo systemctl status postgresql
   ```

2. **Check database connectivity:**

   ```bash
   psql -h localhost -U postgres -d dts_shared
   ```

3. **Check database configuration settings:**

   ```sql
   -- Verify instance_system_settings exist
   SELECT * FROM instance_system_settings LIMIT 5;

   -- Check if settings are properly configured
   SELECT website_name, dts_instance_type, totp_issuer
   FROM instance_system_settings;
   ```

### 7.3 Email Configuration Issues

**Problem**: Invitation emails not being sent

**Solutions**:

1. **Test SMTP settings using common tools:**

   ```bash
   # Using telnet (commonly pre-installed)
   telnet your-smtp-server.com 25

   # Example telnet SMTP session for testing:
   HELO yourdomain.com
   MAIL FROM:sender@example.com
   RCPT TO:recipient@example.com
   DATA
   Subject: Test Email from Telnet
   From: sender@example.com
   To: recipient@example.com

   Hello,
   This is a test email sent via telnet and SMTP commands.
   .
   QUIT

   # Using nc (netcat - commonly pre-installed)
   nc -zv your-smtp-server.com 587

   # Using swaks (if available)
   swaks --to test@example.com --server your-smtp-server.com --port 587
   ```

2. **Check email transport configuration in .env** (EMAIL*TRANSPORT, SMTP*\* variables)

3. **Verify firewall allows SMTP traffic**

---

## 8. Security Considerations

### 8.1 Password Security

- **Use strong passwords** (minimum 12 characters with mixed case, numbers, and symbols)
- **Change default passwords** immediately after installation
- **Enable two-factor authentication** for super admin accounts
- **Regularly rotate passwords** (quarterly recommended)

### 8.2 Database Security

- **Use encrypted connections** (`sslmode=require` in DATABASE_URL)
- **Restrict database access** to application servers only
- **Regular security updates** for PostgreSQL
- **Backup encryption** for sensitive data

### 8.3 Network Security

- **Use HTTPS** in production environments
- **Configure firewall rules** to restrict access
- **Regular security audits** and penetration testing
- **Monitor access logs** for suspicious activity

### 8.4 Multi-Tenant Security

- **Data isolation** is enforced at the application level
- **Country accounts** cannot access other countries' data
- **Role-based permissions** control feature access
- **Audit logging** tracks all administrative actions

---

## 9. Backup and Recovery

### 9.1 Database Backup

```bash
# Create backup
pg_dump -U postgres -h localhost dts_shared > dts_shared_backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/dts"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres dts_shared | gzip > $BACKUP_DIR/dts_shared_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 9.2 Application Backup

```bash
# Backup configuration and uploads
tar -czf dts_app_backup_$(date +%Y%m%d).tar.gz \
    .env \
    ./uploads/ \
    docker-compose.yml
```

---

## 10. Monitoring and Maintenance

### 10.1 Health Checks

> **Note**: The `/health` endpoint is currently under review. We are researching best practices for health check implementation in Node.js applications and will adopt these to DELTA Resilience. Findings will be presented to the PMO for final decision.

Planned health check monitoring includes:

- **Application health**: Status of core services
- **Database connectivity**: Connection pool monitoring
- **Disk space**: Storage capacity monitoring
- **Memory usage**: Application memory consumption tracking

### 10.2 Regular Maintenance

- **Weekly**: Check system logs and error reports
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full system backup and recovery testing
- **Annually**: Security audit and password rotation

---

## Support and Documentation

For additional support:

- **Technical Documentation**: Refer to the complete technical documentation
- **Architecture Guide**: Review the architecture overview
- **API Documentation**: For integration requirements
- **Community Support**: GitHub issues and discussions

---

_This installation guide provides comprehensive instructions for setting up and managing the DELTA Resilience Shared Instance. Always follow your organization's security policies and procedures when implementing these systems._

---

## Version History

| Version | Date (YYYY-MM-DD) | Author    | Description                                                                                                                                                                                                                                                        |
| ------- | ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1.0   | 2025-08-11        | Dieka Jr. | Updated documentation with enhanced super admin password management methods, corrected login paths, and accurate descriptions of super admin capabilities. Improved clarity for system administrators setting up the shared instance. Addresses GitHub issue #212. |
| 1.0.0   | 2025-07-14        | Dieka Jr. | Initial draft of DELTA Resilience Shared Instance installation documentation. Includes super admin setup procedures, multi-tenant configuration, and comprehensive troubleshooting guide. Addresses GitHub issue #212.                                             |
