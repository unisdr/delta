import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { fetchData, getTotalRecords } from "~/components/ContentPicker/DataSource";
import { contentPickerConfig } from "./content-picker-config";
import { json } from "@remix-run/node";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: any) => {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const view = url.searchParams.get("view") || "0"; // Default to 0

    // Use a dictionary for better readability & scalability
    const configMap: Record<string, any> = {
        "0": contentPickerConfig,
    };

    // Fallback to default if view is invalid
    const config = configMap[view] || contentPickerConfig;

    try {
        const results = await fetchData(config, searchQuery, page, limit);
        const totalRecords = await getTotalRecords(config, searchQuery);

        return Response.json({ data: results, totalRecords, page, limit });
    } catch (error) {
        console.error("Error fetching data:", error);
        return Response.json({ error: "Error fetching data" }, { status: 500 });
    }
});