import { json } from "@remix-run/node";
import { handleGeographicImpactQuery } from "~/backend.server/handlers/analytics/geographicImpact";

export const loader = async ({ request }: { request: Request }) => {
    try {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams);

        // Get GeoJSON data
        const geoJSON = await handleGeographicImpactQuery(params);

        // Return the GeoJSON with proper content type
        return json(geoJSON, {
            headers: {
                'Content-Type': 'application/geo+json'
            }
        });

    } catch (error) {
        console.error("Error in geographic-impacts loader:", error);
        
        // Return empty GeoJSON for errors
        return json({
            type: "FeatureCollection",
            features: []
        }, {
            headers: {
                'Content-Type': 'application/geo+json'
            },
            status: error instanceof Error && error.message.includes("Invalid query parameters") ? 400 : 500
        });
    }
};
