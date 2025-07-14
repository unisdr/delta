# DTS Shared Instance Installation Guide

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

The DTS Shared Instance uses a **Single Database Multi-Tenancy** architecture that allows multiple countries to share the same infrastructure while maintaining strict data sovereignty and security controls. This installation guide covers the setup process for system administrators and technical consultants.

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
- **Node.js**: v22.x
- **PostgreSQL**: v16 with PostGIS extension
- **Docker & Docker Compose**: Latest versions (for containerized deployment)
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

   ```ini
   # Database Configuration (Required in .env)
   DATABASE_URL="postgresql://postgres:your_secure_password@localhost:5432/dts_shared"
   
   # Application Settings (Required in .env)
   NODE_ENV="production"
   APP_VERSION="0.0.7"
   PORT=3000
   
   # Security (Required in .env)
   SESSION_SECRET="your-very-secure-session-secret-key-here"
   
   # Email Configuration (Required in .env)
   EMAIL_TRANSPORT="smtp"
   EMAIL_FROM="noreply@your-domain.com"
   SMTP_HOST="your-smtp-server.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="your-smtp-username"
   SMTP_PASS="your-smtp-password"
   
   # Authentication (Required in .env)
   AUTHENTICATION_SUPPORTED="form"
   
   # Azure B2C SSO (Optional - only if using SSO)
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
   ```

   **Variables moved to database** (configured via super admin interface):
   - `WEBSITE_LOGO` → `instance_system_settings.website_logo`
   - `WEBSITE_NAME` → `instance_system_settings.website_name`
   - `WEBSITE_URL` → `instance_system_settings.website_url`
   - `APPROVED_RECORDS_ARE_PUBLIC` → `instance_system_settings.approved_records_are_public`
   - `TOTP_ISSUER` → `instance_system_settings.totp_issuer`
   - `DTS_INSTANCE_TYPE` → `instance_system_settings.dts_instance_type`
   - `DTS_INSTANCE_CTRY_ISO3` → `instance_system_settings.dts_instance_ctry_iso3`
   - `CURRENCY_CODES` → `instance_system_settings.currency_codes`

4. **Build and Start the Application**
   ```bash
   # Build the Docker images
   docker-compose build
   
   # Start the services
   docker-compose up -d
   
   # Initialize the database schema
   docker-compose exec app yarn run drizzle-kit push
   
   # Seed default system settings
   docker-compose exec app yarn run db:seed
   ```

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
   ```

3. **Clone and Setup Application**
   ```bash
   git clone https://github.com/unisdr/dts-shared-instance.git
   cd dts-shared-instance
   yarn install
   cp example.env .env
   # Edit .env file with infrastructure variables only (see Docker section above)
   yarn run drizzle-kit push
   
   # Initialize default system settings in database
   yarn run db:seed
   ```

4. **Start the Application**
   ```bash
   yarn run build
   yarn run start
   ```

---

## 4. Super Admin Setup

### 4.1 Initial Database Setup

Before creating the super admin user, ensure the database has the required default settings:

#### Database Seeding
```bash
# For Docker deployment
docker-compose exec app yarn run db:seed

# For manual installation  
yarn run db:seed
```

This command will:
- Create default `instance_system_settings` record
- Set up initial system configuration
- Prepare the database for multi-tenant operation

#### Verify Database Setup
```sql
-- Connect to database
psql -U postgres -d dts_shared

-- Check if instance_system_settings exists
SELECT COUNT(*) FROM instance_system_settings;

-- View default settings
SELECT 
    website_name, 
    dts_instance_type, 
    totp_issuer,
    admin_setup_complete
FROM instance_system_settings;
```

### 4.2 Initial Super Admin Creation

After the initial installation, you need to create the super admin user to manage country accounts.

#### Method 1: Database Script (Recommended)

1. **Connect to the PostgreSQL database:**
   ```bash
   # For Docker deployment
   docker-compose exec db psql -U postgres -d dts_shared
   
   # For manual installation
   sudo -u postgres psql -d dts_shared
   ```

2. **Create the super admin user:**
   ```sql
   -- Insert a super admin user
   INSERT INTO users (
       id,
       email,
       password_hash,
       role,
       is_primary_admin,
       is_super_admin,
       email_verified,
       created_at,
       updated_at
   ) VALUES (
       gen_random_uuid(),
       'superadmin@your-domain.com',
       '$2a$10$placeholder_hash_will_be_updated',
       'super_admin',
       true,
       true,
       true,
       NOW(),
       NOW()
   );
   ```

3. **Update the super admin password using the application:**
   
   Create a temporary script file `set-super-admin-password.js`:
   ```javascript
   const bcrypt = require('bcryptjs');
   const { Client } = require('pg');
   
   async function setSuperAdminPassword() {
       const client = new Client({
           connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/dts_shared'
       });
       
       await client.connect();
       
       const email = 'superadmin@your-domain.com';
       const newPassword = 'YourSecurePassword123!'; // Change this to your desired password
       
       // Hash the password
       const saltRounds = 10;
       const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
       
       // Update the user's password
       const result = await client.query(
           'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
           [hashedPassword, email]
       );
       
       if (result.rowCount > 0) {
           console.log('Super admin password updated successfully!');
           console.log(`Email: ${email}`);
           console.log(`Password: ${newPassword}`);
           console.log('Please change this password after first login.');
       } else {
           console.log('Super admin user not found.');
       }
       
       await client.end();
   }
   
   setSuperAdminPassword().catch(console.error);
   ```

4. **Run the password update script:**
   ```bash
   # For Docker deployment
   docker-compose exec app node set-super-admin-password.js
   
   # For manual installation
   node set-super-admin-password.js
   ```

#### Method 2: Environment Variable Method

1. **Add to your `.env` file:**
   ```ini
   SUPER_ADMIN_EMAIL="superadmin@your-domain.com"
   SUPER_ADMIN_PASSWORD="YourSecurePassword123!"
   SUPER_ADMIN_SETUP="true"
   ```

2. **Restart the application:**
   ```bash
   # For Docker
   docker-compose restart app
   
   # For manual installation
   yarn run start
   ```

### 4.3 Super Admin Login

1. **Access the application** at your configured URL (e.g., `http://localhost:3000` or your domain)

2. **Navigate to the login page** (`/login`)

3. **Enter the super admin credentials:**
   - **Email**: `superadmin@your-domain.com`
   - **Password**: The password you set in the previous step

4. **Upon successful login**, you will be redirected to the super admin dashboard where you can:
   - **Configure system settings** (website name, logo, TOTP issuer, etc.)
   - Create and manage country accounts
   - Configure system settings
   - Monitor system status
   - Manage user permissions

5. **Important: Configure System Settings First**
   
   Before creating country accounts, configure the shared instance settings:
   
   a. **Navigate to System Settings** (`/settings/system`)
   
   b. **Configure the following required settings:**
   ```
   Website Name: "DTS Shared Instance" (or your preferred name)
   Website Logo: "/assets/shared-instance-logo.png" 
   Instance Type: "shared"
   TOTP Issuer: "DTS Shared System"
   Approved Records Public: false (recommended for shared instances)
   ```
   
   c. **Save the configuration**
   
   These settings will serve as defaults for new country accounts.

### 4.4 Change Super Admin Password (Post-Installation)

For security, change the super admin password after the initial setup:

1. **Log in as super admin**
2. **Navigate to Profile Settings** (`/settings/profile`)
3. **Update password** using the change password form
4. **Save changes** and log out/in to verify

---

## 5. Country Account Management

Once logged in as super admin, you can manage country accounts:

### 5.1 Creating Country Accounts

1. **Navigate to Country Accounts** (`/settings/country-accounts`)
2. **Click "Add Country Account"**
3. **Fill in the required information:**
   - **Country**: Select from the dropdown
   - **Status**: Active/Inactive
   - **Type**: Official/Training
   - **Admin Email**: Email for the country's primary administrator
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
    website_name = 'DTS Shared Instance',
    website_logo = '/assets/shared-instance-logo.png',
    dts_instance_type = 'shared',
    totp_issuer = 'DTS Shared System',
    approved_records_are_public = false
WHERE id = 'your-settings-id';
```

### 6.2 Environment Variables (.env)

Only infrastructure and security variables remain in `.env`:

```ini
# Required Infrastructure Variables
DATABASE_URL="postgresql://user:pass@host:port/db"
SESSION_SECRET="secure-random-string"
NODE_ENV="production"
APP_VERSION="0.0.7"
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
1. **Test SMTP settings:**
   ```bash
   # Use a tool like swaks to test SMTP
   swaks --to test@example.com --server your-smtp-server.com --port 587
   ```

2. **Check email transport configuration in .env** (EMAIL_TRANSPORT, SMTP_* variables)

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
    public/uploads/ \
    docker-compose.yml
```

---

## 10. Monitoring and Maintenance

### 10.1 Health Checks

- **Application health**: `GET /health`
- **Database connectivity**: Monitor connection pool
- **Disk space**: Ensure adequate free space
- **Memory usage**: Monitor application memory consumption

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

*This installation guide provides comprehensive instructions for setting up and managing the DTS Shared Instance. Always follow your organization's security policies and procedures when implementing these systems.*

---

## Version History

| Version | Date (YYYY-MM-DD) | Author | Description |
| ------- | ----------------- | ------ | ----------- |
| 1.0.0   | 2025-07-14        | Dieka Jr. | Initial draft of DTS Shared Instance installation documentation. Includes super admin setup procedures, multi-tenant configuration, and comprehensive troubleshooting guide. Addresses GitHub issue #212. |