import { json } from "@remix-run/node";
import { handleGeographicImpactQuery } from "~/backend.server/handlers/analytics/geographicImpact";
import { z } from "zod";

export const loader = async ({ request }: { request: Request }) => {
    try {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams);

        // Ensure we pass subSectorId if it exists
        const subSectorId = url.searchParams.get('subSectorId');
        if (subSectorId) {
            params.subSectorId = subSectorId;
        }

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
        
        let status = 500;
        let message = "Internal server error";

        if (error instanceof z.ZodError) {
            status = 400;
            message = "Invalid query parameters: " + error.message;
        } else if (error instanceof Error) {
            if (error.message.includes("Invalid level")) {
                status = 400;
                message = error.message;
            } else if (error.message.includes("Invalid parentId")) {
                status = 400;
                message = error.message;
            }
        }
        
        // Return empty GeoJSON with appropriate error status
        return json({
            type: "FeatureCollection",
            features: [],
            error: message
        }, {
            headers: {
                'Content-Type': 'application/geo+json'
            },
            status
        });
    }
};
