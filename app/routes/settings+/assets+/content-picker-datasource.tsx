import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { fetchData, getTotalRecords } from "~/components/ContentPicker/DataSource";
import { contentPickerConfigSector } from "../../../frontend/asset-content-picker-config";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: any) => {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    // Fallback to default if view is invalid
    const config = contentPickerConfigSector;

    try {
        const results = await fetchData(config, searchQuery, page, limit);
        const totalRecords = await getTotalRecords(config, searchQuery);

        return Response.json({ data: results, totalRecords, page, limit });
    } catch (error) {
        console.error("Error fetching data:", error);
        return Response.json({ error: "Error fetching data" }, { status: 500 });
    }
});