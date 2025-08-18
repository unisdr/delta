# API Key User Assignment - Developer Guide

## Overview

This document explains the implementation of the API key user assignment feature in the DTS system. This feature allows API keys to be linked to specific users, with the key's validity tied to the user's status.

## Implementation Details

### Data Structure

API keys are linked to users through two fields:
- `managedByUserId`: The admin user who created the key
- `assignedToUserId`: The user to whom the key is assigned (optional)

The assignment is stored in the API key's name with a special suffix format:
```
{original_name}__ASSIGNED_USER_{userId}
```

### Key Components

#### 1. TokenAssignmentParser

This utility class handles parsing and managing the user assignment information:

```typescript
static getTokenAssignment(key: SelectApiKey): {
  assignedUserId: string | null;
  isUserAssigned: boolean;
  cleanName: string;
  managedByUserId: string;
} {
  const assignedUserId = this.parseAssignedUserId(key.name);
  return {
    assignedUserId,
    isUserAssigned: assignedUserId !== null,
    cleanName: this.getCleanTokenName(key.name),
    managedByUserId: key.managedByUserId
  };
}
```

#### 2. UserStatusValidator

This class validates API key access based on the assigned user's status:

```typescript
static async validateTokenAccess(key: SelectApiKey): Promise<{isValid: boolean, reason?: string, validatedUser?: 'admin' | 'assigned_user'}> {
  const assignment = TokenAssignmentParser.getTokenAssignment(key);
  if (assignment.isUserAssigned && assignment.assignedUserId) {
    const assignedUserActive = await this.isUserActiveForApi(assignment.assignedUserId);
    if (!assignedUserActive) {
      return {
        isValid: false,
        reason: "API key is disabled because the assigned user is inactive",
        validatedUser: 'assigned_user'
      };
    }
    // User is active, key is valid
    return {
      isValid: true,
      validatedUser: 'assigned_user'
    };
  }
  // Continue with admin validation...
}
```

#### 3. API Key Form

The form component in `app/frontend/api_key.tsx` conditionally renders a user assignment dropdown for admin users:

```typescript
if (props.isAdmin && props.userOptions && props.userOptions.length > 0) {
  fieldOverrides.assignedToUserId = (
    <div key="assignedToUserId" className="form-group">
      <label htmlFor="assignedToUserId">Assign to User (Optional)</label>
      <select
        id="assignedToUserId"
        name="assignedToUserId"
        className="form-control"
        defaultValue={props.fields?.assignedToUserId || ''}
      >
        <option value="">-- Select User (Optional) --</option>
        {props.userOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <small className="form-text text-muted">
        If selected, this API key will only be valid when the assigned user is active.
      </small>
    </div>
  );
}
```

#### 4. API Key Creation/Update Logic

When saving an API key, the assigned user ID is incorporated into the key name:

```typescript
// For update, we need to use only the fields that apiKeyUpdate expects
return apiKeyUpdate(tx, id, {
  name: fields.assignedToUserId 
    ? `${fields.name}__ASSIGNED_USER_${fields.assignedToUserId}` 
    : fields.name,
  // Other fields...
});
```

## Permission Logic

### Role-Based Access Control

API key management is controlled by the `EditAPIKeys` permission, which is only granted to the following roles:

- **admin**


Other roles like **data-viewer**, **data-collector**, and **data-validator** do not have this permission and cannot create or manage API keys.

### Permission Implementation

The permission check is implemented in the route handlers using `authLoaderWithPerm` and `authActionWithPerm`:

```typescript
export const loader = authLoaderWithPerm("EditAPIKeys", async ({ request, params }) => {
  // API key loading logic
});

export const action = authActionWithPerm("EditAPIKeys", async ({ request, params }) => {
  // API key saving logic
});
```

### User Types and Capabilities

1. **Regular Users with Admin Role:**
   - Can create API keys for themselves
   - Can create and assign API keys to other users
   - See the user assignment dropdown with all verified users
   - Can manage keys created by themselves or other admins


## Key Validation Flow

1. When an API key is used, the system first checks if it has an assigned user
2. If assigned, it validates that the user is active
3. If the user is inactive, the key is considered invalid
4. If no user is assigned, the key is validated based on the admin who created it

## Implementation Tips

- Always use the `TokenAssignmentParser` to extract the clean name and assignment information
- When displaying keys in the UI, use the clean name (without the assignment suffix)
- When validating keys, check both the assigned user and managing admin status
- The user assignment dropdown should only be shown to admin users
