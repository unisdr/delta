import { HipApi, upsertHip } from '~/backend.server/models/hip'

/**
 * Fetches and processes HIPs data page-by-page.
 * 
 * @param {number} page - The current page number being processed.
 * @throws Will throw an error if maxPages is exceeded to prevent infinite loops.
 */
export async function processHipsPage(page: number): Promise<void> {
    const maxPages = 10; // Define the maximum allowed pages to avoid infinite loops

    console.log(`Processing HIPs page: ${page}`);

    if (page > maxPages) {
        throw new Error("Exceeded max pages, likely infinite loop");
    }

    // Define the API URL for fetching HIPs data
    const url = `https://data.undrr.org/api/json/hips/hazards/1.0.0/?limit=500`;

    try {
        const resp = await fetch(url);
        
        if (!resp.ok) {
            throw new Error(`Failed to fetch data from ${url}, status: ${resp.status}`);
        }

        const res = await resp.json() as HipApi;
        const data = res.data;

        // Process each HIP item asynchronously
        for (const item of data) {
            await upsertHip(item);
        }

        // Ensure last page information exists
        // Uncomment the line below if the API provides a last page number
        // if (!res.last_page) {
        //     throw new Error("No last page info provided by API");
        // }

        // Recursively process the next page if not the last page
        if (page < res.last_page) {
            await processHipsPage(page + 1);
        } else {
            console.log("Completed processing HIPs pages");
        }

    } catch (error) {
        console.error(`Error processing HIPs page ${page}:`, error);
    }
}