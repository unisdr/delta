import fs from 'fs/promises';
import {
    CategoryType,
    upsertRecord as upsertRecordCategory,
} from "~/backend.server/models/category";
import {parseCSV} from "~/util/csv"

/**
 * Reads and processes category data from a CSV file.
 * Parses the CSV, constructs category records, and inserts/upserts them into the database.
 *
 * @throws Will throw an error if the file is not found or if an operation fails.
 */
export async function processCategoryCsv(): Promise<void> {
    const currentDirectory = process.cwd(); // Get the current working directory
    const filePath = `${currentDirectory}/dts_imports/categories.csv`; // Define the file path

    let fileString: string = '';

    try {
        // Read the CSV file as a string
        fileString = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        console.error('Error reading file:', error);
        throw new Response('File not found', { status: 404 });
    }

    // Parse the CSV file content into an array of data rows
    const all = await parseCSV(fileString);

    console.log(`Parsed ${all.length} rows.`);
    if (all.length < 2) {
        throw new Error('CSV file seems to have insufficient data');
    }

    // Loop through all rows, skipping the first (header row)
    all.forEach((item, index) => {
        if (index === 0) return; // Skip header row

        // Initialize a category record object
        let formRecord: CategoryType = {
            id: item[0],
            name: item[1],
            level: parseInt(item[3])
        };

        // Determine if this category has a parent
        if (item[2] && item[2].trim().length > 0) {
            formRecord.parentId = item[2];
        }

        // Attempt to upsert category data
        upsertRecordCategory(formRecord)
            .then(() => console.log(`Processed category: ${formRecord.name} (ID: ${formRecord.id})`))
            .catch(error => console.error(`Error inserting category record:`, error));
    });

    console.log('Category CSV processing completed.');
}