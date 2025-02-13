import { fetchData, getTotalRecords } from "~/components/ContentPicker/DataSource";
import { contentPickerConfig } from "./content-picker-config-tree";

export const loader = async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    try {
        const results = await fetchData(contentPickerConfig, searchQuery, page, limit);
        const totalRecords = await getTotalRecords(contentPickerConfig, searchQuery);

        return { data: results, totalRecords, page, limit };
    } catch (error) {
        console.error("Error fetching disaster events:", error);
        return { error: "Error fetching data" };
    }
};