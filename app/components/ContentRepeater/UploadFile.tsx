import fs from "fs";
import path from "path";
import ContentRepeaterFileValidator from "./FileValidator";

interface Item {
  file?: {
    name: string;
    content_type: string;
    view?: string;
    tenantPath?: string; // Added to support tenant isolation
  };
}

const debug = false;

class ContentRepeaterUploadFile {
  static delete(itemsData: any[], publicPath: string = path.join(process.cwd()), countryAccountsId?: string): Item[] {
    let items: Item[];

    try {
      items = itemsData;
    } catch (error) {
      throw new Error("Invalid JSON data.");
    }

    // Iterate over items and delete the specified files
    items.forEach((item) => {
      if (item.file?.name) {
        // Handle tenant path from item if available, otherwise use tenantContext
        let tenantPath = "";
        if (item.file.tenantPath) {
          tenantPath = item.file.tenantPath;
        } else if (countryAccountsId) {
          tenantPath = `/tenant-${countryAccountsId}`;
        }

        // Check if the file path already includes tenant path
        const hasExistingTenantPath = item.file.name.includes('/tenant-');

        let relativeFilePath = item.file.name.startsWith("/")
          ? item.file.name.substring(1) // Remove leading slash
          : item.file.name;

        // Add tenant path if it's not already included
        if (!hasExistingTenantPath && tenantPath && !relativeFilePath.includes(`tenant-`)) {
          const pathParts = relativeFilePath.split('/');
          // Insert tenant path after the first segment
          if (pathParts.length > 1) {
            pathParts.splice(1, 0, `tenant-${countryAccountsId}`);
            relativeFilePath = pathParts.join('/');
          }
        }

        const absoluteFilePath = path.resolve(publicPath, relativeFilePath);

        if (fs.existsSync(absoluteFilePath)) {
          try {
            fs.unlinkSync(absoluteFilePath); // Delete the file
            if (debug) console.log(`Deleted file: ${absoluteFilePath}`);
          } catch (error) {
            console.error(`Failed to delete file: ${absoluteFilePath}`, error);
          }
        } else {
          console.warn(`File not found: ${absoluteFilePath}. Skipping.`);
        }
      }
    });

    // Remove empty directories
    const removeEmptyDirectories = (directory: string) => {
      if (!fs.existsSync(directory)) return;

      const files = fs.readdirSync(directory);

      if (files.length === 0) {
        try {
          fs.rmdirSync(directory); // Delete the empty directory
          if (debug) console.log(`Deleted empty directory: ${directory}`);
        } catch (error) {
          console.error(`Failed to delete directory: ${directory}`, error);
        }
      } else {
        files.forEach((file) => {
          const filePath = path.join(directory, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            removeEmptyDirectories(filePath);
          }
        });

        const updatedFiles = fs.readdirSync(directory);
        if (updatedFiles.length === 0) {
          try {
            fs.rmdirSync(directory);
            if (debug) console.log(`Deleted empty directory: ${directory}`);
          } catch (error) {
            console.error(`Failed to delete directory: ${directory}`, error);
          }
        }
      }
    };

    removeEmptyDirectories(publicPath);
    return items; // Return the items as a string
  }

  static save(
    itemsData: any[],
    tempPath: string,
    destinationPath: string,
    publicPath: string = path.join(process.cwd()),
    countryAccountsId?: string
  ): Item[] {
    let items: Item[];

    try {
      items = itemsData;
    } catch (error) {
      throw new Error("Invalid JSON data.");
    }

    // Normalize paths
    tempPath = tempPath.startsWith("/") ? tempPath.slice(1) : tempPath;
    destinationPath = destinationPath.startsWith("/") ? destinationPath.slice(1) : destinationPath;
    publicPath = path.normalize(publicPath);

    // Handle tenant path for both temp and destination paths
    let tenantPathSegment = "";
    if (countryAccountsId) {
      tenantPathSegment = `tenant-${countryAccountsId}`;
      if (debug) console.log(`Using tenant path segment: ${tenantPathSegment}`);
    }

    // Construct paths with tenant isolation
    let absoluteDestinationPath;

    // If countryAccountsId is provided, use it for tenant isolation
    if (countryAccountsId) {
      absoluteDestinationPath = path.resolve(publicPath, tenantPathSegment, destinationPath);
      if (debug) console.log(`Using countryAccountsId for destination path: ${absoluteDestinationPath}`);
    }
    // Otherwise, check if any items have tenant paths that should be preserved
    else {
      // Check if any items have tenant path information
      const hasTenantItems = itemsData.some(item =>
        item.file?.tenantPath || (item.file?.name && item.file.name.includes('/tenant-')));

      if (hasTenantItems) {
        // Extract tenant ID from the first item with a tenant path
        let extractedTenantId = null;

        for (const item of itemsData) {
          if (!item.file?.name) continue;

          // Try to get from tenantPath property
          if (item.file.tenantPath) {
            const match = item.file.tenantPath.match(/tenant-([\w-]+)/);
            if (match) {
              extractedTenantId = match[1];
              break;
            }
          }

          // Try to extract from file name
          const match = item.file.name.match(/tenant-([\w-]+)/);
          if (match) {
            extractedTenantId = match[1];
            break;
          }
        }

        if (extractedTenantId) {
          absoluteDestinationPath = path.resolve(publicPath, `tenant-${extractedTenantId}`, destinationPath);
          if (debug) console.log(`Using extracted tenant ID for destination path: ${absoluteDestinationPath}`);
        } else {
          absoluteDestinationPath = path.resolve(publicPath, destinationPath);
          if (debug) console.log(`No tenant ID found, using default destination path: ${absoluteDestinationPath}`);
        }
      } else {
        absoluteDestinationPath = path.resolve(publicPath, destinationPath);
        if (debug) console.log(`No tenant items found, using default destination path: ${absoluteDestinationPath}`);
      }
    }

    // Ensure destination directory exists
    if (!fs.existsSync(absoluteDestinationPath)) {
      try {
        fs.mkdirSync(absoluteDestinationPath, { recursive: true });
      } catch (error) {
        throw new Error(`Failed to create destination path: ${absoluteDestinationPath}`);
      }
    }

    const expectedFiles = new Set();

    items = items.map((item) => {
      if (!item.file?.name) {
        // Return item unmodified if no file exists
        return item;
      }

      // Parse the file path to extract components
      const fullPath = item.file.name;
      const fileName = path.basename(fullPath);

      // Check if the path contains a tenant segment
      const tenantMatch = fullPath.match(/tenant-([\w-]+)/);
      const hasTenantInPath = !!tenantMatch;

      // Determine tenant path from multiple sources (in order of priority)
      let itemTenantPath = "";

      // 1. Use tenant path from item metadata if available
      if (item.file.tenantPath) {
        itemTenantPath = item.file.tenantPath;
        if (debug) console.log(`Using tenant path from item metadata: ${itemTenantPath}`);
      }
      // 2. Extract tenant path from the file path itself
      else if (hasTenantInPath) {
        const tenantId = tenantMatch[1];
        itemTenantPath = `/tenant-${tenantId}`;
        if (debug) console.log(`Extracted tenant path from file path: ${itemTenantPath}`);
      }
      // 3. Use provided countryAccountsId parameter
      else if (countryAccountsId) {
        itemTenantPath = `/tenant-${countryAccountsId}`;
        if (debug) console.log(`Using countryAccountsId for tenant path: ${itemTenantPath}`);
      }

      // Construct possible temp file paths to check (try both with and without tenant path)
      const possibleTempPaths = [];

      // First priority: Path with tenant segment
      if (itemTenantPath) {
        possibleTempPaths.push(path.resolve(publicPath, itemTenantPath.replace(/^\//, ''), tempPath, fileName));
      }

      // Second priority: Direct path without tenant segment
      possibleTempPaths.push(path.resolve(publicPath, tempPath, fileName));

      // Find the first path that exists
      let tempFilePath = null;
      for (const pathToCheck of possibleTempPaths) {
        if (fs.existsSync(pathToCheck)) {
          tempFilePath = pathToCheck;
          if (debug) console.log(`Found temp file at: ${tempFilePath}`);
          break;
        } else if (debug) {
          console.log(`Temp file not found at: ${pathToCheck}`);
        }
      }

      // If no file found, use the first path as fallback
      if (!tempFilePath) {
        tempFilePath = possibleTempPaths[0];
        if (debug) console.log(`No temp file found, using fallback path: ${tempFilePath}`);
      }

      const originalFileName = path.basename(item.file.name);

      if (!ContentRepeaterFileValidator.isValidExtension(originalFileName)) {
        throw new Error(`Invalid file type: ${originalFileName}`);
      }

      const cleanedFileName = originalFileName.replace(/^\d+_/, ""); // Remove timestamp prefix
      const destinationFilePath = path.resolve(absoluteDestinationPath, cleanedFileName);
      expectedFiles.add(cleanedFileName);

      if (debug) console.log('originalFileName: ', originalFileName);
      if (debug) console.log('cleanedFileName: ', cleanedFileName);
      if (debug) console.log('tempFilePath: ', tempFilePath);

      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          // Move file and update item
          fs.renameSync(tempFilePath, destinationFilePath);

          // Determine the tenant path to preserve in the file path
          let tenantPathToPreserve = "";

          // Priority 1: Use the tenant path from the destination path
          const destTenantMatch = absoluteDestinationPath.match(/tenant-(\w+-\w+-\w+-\w+-\w+)/);
          if (destTenantMatch) {
            tenantPathToPreserve = `/tenant-${destTenantMatch[1]}`;
          }
          // Priority 2: Use the tenant path from item metadata
          else if (item.file.tenantPath) {
            tenantPathToPreserve = item.file.tenantPath;
          }
          // Priority 3: Use the provided countryAccountsId
          else if (countryAccountsId) {
            tenantPathToPreserve = `/tenant-${countryAccountsId}`;
          }

          // Update item file path with proper tenant path
          if (tenantPathToPreserve) {
            // Get the relative path from the destination path without the tenant segment
            const tenantSegmentInPath = tenantPathToPreserve.replace(/^\//, '');
            const pathWithoutTenant = absoluteDestinationPath.replace(new RegExp(`${tenantSegmentInPath}\/`), '');
            const relativePathWithoutTenant = path.relative(publicPath, pathWithoutTenant);

            // Construct the final path with tenant segment
            item.file.name = `/${tenantSegmentInPath}/${relativePathWithoutTenant}/${cleanedFileName}`;

            // Store tenant path for future operations
            item.file.tenantPath = tenantPathToPreserve;

            if (debug) console.log(`Updated file path with tenant: ${item.file.name}`);
          } else {
            // No tenant path to preserve, use simple relative path
            const relativePath = path.relative(publicPath, destinationFilePath);
            item.file.name = `/${relativePath}`;

            if (debug) console.log(`Updated file path without tenant: ${item.file.name}`);
          }

          // Remove temporary view property
          delete item.file?.view;

          if (debug) console.log(`File moved successfully from ${tempFilePath} to ${destinationFilePath}`);
        } catch (error) {
          console.error(
            `Failed to move file: ${tempFilePath} to ${destinationFilePath}`,
            error
          );
          throw new Error(`Failed to move file: ${originalFileName}`);
        }
      } else {
        console.warn(`File not found in temp directory: ${tempFilePath}. Skipping.`);
      }

      return item;
    });

    // Remove unreferenced files in destination
    fs.readdirSync(absoluteDestinationPath).forEach((file) => {
      if (!expectedFiles.has(file)) {
        try {
          fs.unlinkSync(path.join(absoluteDestinationPath, file));
          if (debug) console.log(`Deleted unreferenced file: ${file}`);
        } catch (error) {
          console.error(`Failed to delete unreferenced file: ${file}`, error);
        }
      }
    });

    if (debug) console.log("Final data items:", JSON.stringify(items, null, 2));
    return items; // Return updated items
  }

}

export { ContentRepeaterUploadFile };
