# Tenant Isolation for File Storage - Testing Guide

**Date:** July 17, 2025  
**Author:** Development Team  
**Version:** 1.1 - Updated

## Overview

This document provides guidance for testing the tenant isolation implementation for file storage in the DELTA Resilience system. The implementation ensures that uploaded files are stored and managed separately per tenant/instance, providing secure, tenant-aware file handling consistent with the existing tenant isolation framework.

## Background

The tenant isolation for file storage was implemented to facilitate easier export/import of country instance data between different DELTA Resilience systems. This implementation ensures that:

1. Files are stored in tenant-specific directories (`/public/tenant-{countryAccountId}/uploads/...`)
2. File access is restricted to the appropriate tenant
3. Data remains properly isolated across tenants
4. Backward compatibility is maintained for legacy files

**Implementation Status:** Complete and verified for all three file upload routes:

- Hazardous Events
- Disaster Events
- Disaster Records

## Testing Prerequisites

Before beginning testing, ensure you have:

1. Access to at least two different tenant accounts in the DELTA Resilience system
2. Administrator privileges for testing tenant-specific operations
3. A local or development environment with the latest codebase
4. Sample files of various types (images, PDFs, documents) for upload testing

## Test Scenarios

### 1. File Upload Testing

#### Test Case 1.1: Single-Tenant File Upload

1. **Setup:**

   - Log in as a user from Tenant A (e.g., Congo - COG)
   - Navigate to a hazardous event, disaster event, or disaster record creation/edit form

2. **Actions:**

   - Upload a file through the file upload component
   - Complete and save the form

3. **Verification:**
   - ✅ Verify the file is saved in the tenant-specific directory: `/public/tenant-{tenantA_id}/uploads/temp`
   - ✅ Verify the file can be viewed/downloaded from the record/event page
   - ✅ Check server logs to confirm tenant context was properly applied
   - Example log output:
     ```
     hazardous-event+/file-pre-upload action called with user session: true
     Extracted tenant context: {
       countryAccountId: '87608359-e400-43bb-95a7-fc77b9f68f7b',
       countryId: '00d6a4cb-add9-42b9-964e-7116d2c7bd00',
       countryName: 'Congo',
       iso3: 'COG'
     }
     Using tenant path: /tenant-87608359-e400-43bb-95a7-fc77b9f68f7b
     ```

#### Test Case 1.2: Cross-Tenant File Access

1. **Setup:**

   - Upload a file while logged in as Tenant A (e.g., Congo - COG)
   - Log out and log in as a user from Tenant B (e.g., Democratic Republic of the Congo - COD)

2. **Actions:**

   - Attempt to access the file uploaded by Tenant A through direct URL manipulation

3. **Verification:**
   - ✅ Verify access is denied or file is not found
   - ✅ Confirm proper error handling without system crashes
   - ✅ Verify that each tenant can only see their own uploaded files

### 2. File Viewing Testing

#### Test Case 2.1: Tenant-Specific File Viewing

1. **Setup:**

   - Log in as users from both Tenant A (COG) and Tenant B (COD)
   - Have files uploaded for each tenant

2. **Actions:**

   - As Tenant A, view files associated with Tenant A records
   - As Tenant B, view files associated with Tenant B records

3. **Verification:**
   - ✅ Verify each tenant can only see their own files
   - ✅ Confirm file paths in HTML source include tenant context
   - ✅ Verify file paths in the browser show the correct tenant directory structure

#### Test Case 2.2: Public File Access (if applicable)

1. **Setup:**

   - Configure certain records to be publicly accessible

2. **Actions:**

   - Access public records with file attachments without logging in

3. **Verification:**
   - Verify public access works as expected while maintaining tenant isolation

### 3. CSV Export Testing

#### Test Case 3.1: Tenant-Specific Data Export

1. **Setup:**

   - Log in as a user from Tenant A
   - Navigate to the export functionality

2. **Actions:**

   - Export disaster records or events as CSV

3. **Verification:**
   - Verify only Tenant A data is included in the export
   - Check that file references in the export maintain tenant context

### 4. Backward Compatibility Testing

#### Test Case 4.1: Legacy File Access

1. **Setup:**

   - Identify or create files in the legacy path structure (without tenant prefix)

2. **Actions:**

   - Access these files through the updated system

3. **Verification:**
   - Verify legacy files are still accessible
   - Confirm the system attempts to find files in tenant-specific paths first, then falls back to legacy paths

### 5. Edge Case Testing

#### Test Case 5.1: File Operations with Missing Tenant Context

1. **Setup:**

   - Simulate scenarios where tenant context might be missing

2. **Actions:**

   - Attempt file operations with incomplete tenant information

3. **Verification:**
   - Verify graceful error handling
   - Confirm appropriate error messages are displayed

#### Test Case 5.2: Large File Handling

1. **Setup:**

   - Prepare files of various sizes up to the system limit

2. **Actions:**

   - Upload and access these files across different tenants

3. **Verification:**
   - Verify tenant isolation works correctly regardless of file size
   - Confirm performance is acceptable

## Technical Verification Points

For technical team members, verify the following implementation details:

1. **Code Implementation:**

   - ✅ Confirm tenant context is extracted in all file-related routes
     - hazardous-event+/file-pre-upload.tsx
     - disaster-event+/file-pre-upload.tsx
     - disaster-record+/file-pre-upload.tsx
   - ✅ Verify all routes use `authLoaderWithPerm` to ensure user session is always present
   - ✅ Check that file paths include tenant identifiers

2. **Directory Structure:**

   - ✅ Verify the `/public/tenant-{countryAccountId}/uploads/temp` structure is used
   - ✅ Confirm tenant directories are created as needed
   - ✅ Verify directory structure for both COG and COD tenants:
     - `/public/tenant-87608359-e400-43bb-95a7-fc77b9f68f7b/uploads/temp` (COG)
     - `/public/tenant-52e1a974-a526-4ec4-948d-956b8c756e12/uploads/temp` (COD)

3. **Error Handling:**
   - ✅ Test error scenarios to ensure proper handling of missing files
   - ✅ Verify security checks prevent path traversal attacks
   - ✅ Confirm appropriate error messages when tenant context is missing

## Reporting Issues

When reporting issues with tenant isolation in file storage, please include:

1. The tenant context you were using
2. The specific file operation that failed
3. Expected vs. actual behavior
4. Any error messages displayed
5. Browser console logs if applicable

## Conclusion

The tenant isolation implementation for file storage is now complete and verified for all three file upload routes (hazardous events, disaster events, and disaster records). Files are correctly stored in tenant-specific directories, ensuring proper data isolation between tenants.

The implementation successfully:

1. Extracts tenant context from user sessions
2. Creates tenant-specific directories as needed
3. Stores files in the correct tenant paths
4. Prevents cross-tenant file access
5. Maintains backward compatibility with legacy files

This implementation is a critical component of the DELTA Resilience system's multi-tenancy architecture and facilitates easier export/import of country instance data between different DELTA Resilience systems.

For any questions or clarifications about the implementation or testing process, please contact the development team.
