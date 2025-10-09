# API Key User Relationship - User Guide

## Overview

This document explains how API keys are linked to users in the DELTA Resilience system and how this relationship affects key validity and management.

## API Keys and User Relationships

### Types of API Key Assignments

In the DELTA Resilience system, API keys can be:

1. **Admin self-managed keys**: Created by an admin for their own use
2. **User-assigned keys**: Created by an admin and assigned to a specific user
3. **Admin-managed keys**: Created by an admin without assignment to a specific user

### Key Validity and User Status

API key validity is directly linked to user status:

- When a user is disabled, all API keys assigned to that user become invalid
- When a user is re-enabled, their assigned API keys become valid again
- Admin-managed keys remain valid as long as the admin who created them is active

## User Roles and API Key Access

### Role-Based Permissions

In the DELTA Resilience system, API key management is restricted by user role:

- **Admin** users can create and manage API keys for themselves and others
- **Regular users** (Data Viewer, Data Collector, Data Validator) cannot create or manage API keys

This permission is controlled by the `EditAPIKeys` permission, which is only granted to admin roles.

### For Admin Users

As an admin user, you can create API keys for your own use:

1. Navigate to **Settings > API Keys**
2. Click **Add new API key**
3. Enter a name for your API key
4. Click **Create API Key**

The key will automatically be linked to your account and will only be valid while your account is active.

### Managing Your API Keys

- You can view all API keys in the system
- You can edit the names of your keys
- You can delete your keys when no longer needed
- Your keys will automatically be disabled if your account is deactivated

## For Administrators

### Creating API Keys

As an administrator, you can:

1. Create API keys for yourself
2. Create API keys and assign them to other users

To create a key and assign it to a user:

1. Navigate to **Settings > API Keys**
2. Click **Add new API key**
3. Enter a name for the API key
4. From the **Assign to User** dropdown, select the user
5. Click **Create API Key**

### Key Management

- You can view all API keys in the system
- You can edit any API key
- You can reassign keys to different users
- You can see which keys are disabled due to user inactivity

### User Status Effects

When viewing API keys:

- Keys assigned to inactive users will be marked as disabled
- Clicking on a disabled key will show a message: "This key is disabled as the related user is disabled"

## Security Implications

### Benefits of User-Linked API Keys

1. **Improved Accountability**: Each API key is linked to a specific user
2. **Automatic Deactivation**: When a user leaves or is disabled, their API keys are automatically invalidated
3. **Granular Control**: Administrators can assign keys to specific users based on their roles

### Best Practices

1. **Regular Audits**: Periodically review API keys and their assignments
2. **Principle of Least Privilege**: Only assign API keys to users who need them
3. **Key Rotation**: Regularly rotate API keys, especially for sensitive operations
4. **Prompt Deactivation**: Disable user accounts promptly when access is no longer needed

## Troubleshooting

### API Key Not Working

If an API key is not working, check:

1. Is the assigned user active in the system?
2. Is the admin who created the key still active?
3. Has the key been revoked or deleted?
4. Are you using the correct key secret?

### Viewing Key Assignment

To check which user an API key is assigned to:

1. Navigate to **Settings > API Keys**
2. Click on the key name to view details
3. The "Assigned to User" field shows the assigned user (if any)

## GitHub Issue Implementation

This feature implements the following requirements from the GitHub ticket:

1. API keys are linked to responsible users (not always the admin)
2. Only admin and super admin users can create API keys
3. Admins can create keys for other users with a user selection dropdown
4. When a user is disabled, their linked API keys become unusable
5. The API key list shows disabled keys with appropriate status
6. Viewing a disabled key shows a message explaining why it's disabled
