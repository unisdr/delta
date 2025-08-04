import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { fetchData, getTotalRecords } from "~/components/ContentPicker/DataSource";
import { contentPickerConfig, contentPickerConfigSector, contentPickerConfigCategory } from "./content-picker-config";
import { sessionCookie } from "~/util/session";

export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
    const { request } = loaderArgs;
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const view = url.searchParams.get("view") || "0"; // Default to 0

    // Use a dictionary for better readability & scalability
    const configMap: Record<string, any> = {
        "0": contentPickerConfig,
        "1": contentPickerConfigSector,
        "2": contentPickerConfigCategory
    };

    // Fallback to default if view is invalid
    const config = configMap[view] || contentPickerConfig;

    try {
        const session =  await sessionCookie().getSession(request.headers.get("Cookie"));
        let countryAccountsId = undefined;
        
        // Extract tenant context from user session (if available)
        if (loaderArgs.userSession) {
            countryAccountsId = session.get("countryAccountsId")
        }

        // Pass tenant context to fetchData and getTotalRecords
        const results = await fetchData(config, searchQuery, page, limit, countryAccountsId);
        const totalRecords = await getTotalRecords(config, searchQuery, countryAccountsId);

        return { data: results, totalRecords, page, limit, countryAccountsId };
    } catch (error) {
        console.error("Error fetching data:", error);
        return Response.json({ error: "Error fetching data" }, { status: 500 });
    }
});