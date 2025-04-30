import fs from 'fs/promises';
import {
    SectorType,
    upsertRecord as upsertRecordSector,
    sectorById,
} from "~/backend.server/models/sector";
import {parseCSV} from "~/util/csv";

/**
 * Reads and processes sector CSV data.
 * Parses the CSV, constructs sector records, and inserts/upserts them into the database.
 *
 * @throws Will throw an error if the file is not found or if an operation fails.
 */
export async function processSectorCsv(): Promise<void> {
    const currentDirectory = process.cwd(); // Get the current working directory
    const filePath = `${currentDirectory}/app/hips/sectors2.csv`; // Define the file path
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

    let sectorRecord: any = {};

    // Loop through all rows, skipping the first (header row if applicable)
    for (const [index, item] of all.entries()) {
        if (index === 0) continue; // Skip header row

        let sectorName = item[2]; // Extract sector name from the CSV row
        sectorName =  sectorName.replace(/\t|\n|\r/g, '')

        // Initialize a sector record object
        let formRecord: SectorType = {
            id: parseInt(item[0]),
            sectorname: sectorName,
            description: item[3]
        };

        // Determine if this sector has a parent (if column 1 is empty, it's a root sector)
        if (!item[1] || String(item[1]).trim().length === 0) {
            formRecord.level = 1;
        } else {
            // Fetch parent sector details for level calculation
            try {
                sectorRecord = await sectorById(parseInt(item[1]));
                if (sectorRecord) {
                    formRecord.parentId = parseInt(item[1]);
                    formRecord.level = sectorRecord.level + 1;
                } else {
                    console.warn(`Parent sector ID ${item[1]} not found`);
                }
            } catch (error) {
                console.error(`Error fetching parent sector:`, error);
            }
        }

        // Attempt to upsert sector data
        try {
            await upsertRecordSector(formRecord);
            console.log(`Processed sector: ${formRecord.sectorname} (ID: ${formRecord.id})`);
        } catch (error) {
            console.error(`Error inserting sector record:`, error);
        }
    }

    console.log('Sector CSV processing completed.');
}