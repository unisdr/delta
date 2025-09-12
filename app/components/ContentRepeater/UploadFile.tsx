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
    publicPath: string = path.join(process.cwd()) 
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

    const absoluteDestinationPath = path.resolve(publicPath, destinationPath);

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

      const tempFilePath = path.resolve(
        publicPath,
        tempPath,
        path.basename(item.file.name)
      );

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

      if (fs.existsSync(tempFilePath)) {
        try {
          // Move file and update item
          fs.renameSync(tempFilePath, destinationFilePath);
          item.file.name = `/${path.relative(publicPath, destinationFilePath)}`; // Update item file path
          delete item.file?.view;
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
