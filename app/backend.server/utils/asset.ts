import fs from 'fs/promises';
import {parseCSV} from "~/util/csv";
import {AssetInsert as AssetType} from "~/drizzle/schema";
import {
    upsertRecord as upsertRecordAsset,
} from "~/backend.server/models/asset";

interface interfaceAssetData {
	name: string;
	sectors: number[];
	apiImportId?: string;
	category?: string;
	id?: string;
	isBuiltIn?: boolean;
	nationalId?: string;
	notes?: string;
}

// Object to store dynamic asset import data
const assetImportData: { [key: string]: interfaceAssetData } = {};

/**
 * Adds asset data dynamically to `assetImportData`
 *
 * @param {string} key - The unique identifier key for the asset.
 * @param {string} name - The asset name.
 * @param {number[]} sectors - Array of associated sector IDs.
 */
function addAssetData(key: string, name: string, sectors: number[]) {
    assetImportData[key] = { name, sectors };
}

/**
 * Reads and processes asset data from a CSV file.
 * Parses the CSV, constructs asset records, and inserts/upserts them into the database.
 *
 * @throws Will throw an error if the file is not found or if an operation fails.
 */
export async function processAssetCsv(): Promise<void> {
    const currentDirectory = process.cwd(); // Get the current working directory
    const filePath = `${currentDirectory}/app/hips/assets.csv`; // Define the file path
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

    // Process each row from the parsed CSV
    all.forEach((item, index) => {
        if (index === 0) return; // Skip header row

        let xAssetName = item[5]?.trim() ?? ''; // Ensure name is properly trimmed
        xAssetName = xAssetName.charAt(0).toUpperCase() + xAssetName.slice(1); // Capitalize first letter
        let xAssetKey = xAssetName.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''); // Normalize key name

        const xSectorId = Number(item[2]); // Convert sector to number

        // Update or initialize asset data
        if (assetImportData[xAssetKey]) {
            if (!assetImportData[xAssetKey].sectors.includes(xSectorId)) {
                assetImportData[xAssetKey].sectors.push(xSectorId);
            }
        } else {
            addAssetData(xAssetKey, xAssetName, [xSectorId]);
            (assetImportData[xAssetKey] as interfaceAssetData).apiImportId = item[0];
            (assetImportData[xAssetKey] as interfaceAssetData).id = item[1];
            (assetImportData[xAssetKey] as interfaceAssetData).isBuiltIn = true;
            (assetImportData[xAssetKey] as interfaceAssetData).category = item[6];
            (assetImportData[xAssetKey] as interfaceAssetData).nationalId = item[7];
            (assetImportData[xAssetKey] as interfaceAssetData).notes = item[8];
        }
    });

    // Process and upsert collected asset data
    for (const key in assetImportData) {
        if (Object.prototype.hasOwnProperty.call(assetImportData, key)) {
            let formRecord: AssetType = {
                apiImportId: assetImportData[key].apiImportId,
                sectorIds: assetImportData[key].sectors.join(','),
                isBuiltIn: true,
                name: assetImportData[key].name,
                category: assetImportData[key].category,
                nationalId: assetImportData[key].nationalId,
                notes: assetImportData[key].notes
            };

            // Assign asset ID only if it exists
            if (assetImportData[key].id !== '') {
                formRecord.id = assetImportData[key].id;
            }

            // Attempt to upsert the asset record
            await upsertRecordAsset(formRecord)
                .then(() => console.log(`Processed asset: ${formRecord.name} (ID: ${formRecord.apiImportId})`))
                .catch(error => console.error(`Error inserting asset record:`, error));
        }
    }

    console.log('Asset CSV processing completed.');
}