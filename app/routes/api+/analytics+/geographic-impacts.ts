import { json } from "@remix-run/node";
import { handleGeographicImpactQuery } from "~/backend.server/handlers/analytics/geographicImpact";
import { z } from "zod";

export const loader = async ({ request }: { request: Request }) => {
    try {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams);

        // Required parameter check
        if (!url.searchParams.get('sectorId')) {
            return json({
                type: "FeatureCollection",
                features: [],
                error: "sectorId is required"
            }, {
                status: 400,
                headers: {
                    'Content-Type': 'application/geo+json',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // Collect all optional parameters
        const optionalParams = [
            'subSectorId',
            'hazardTypeId',
            'hazardClusterId',
            'specificHazardId',
            'geographicLevelId',
            'fromDate',
            'toDate',
            'disasterEventId',
            'parentId',
            'level'
        ];

        // Add optional parameters if they exist
        optionalParams.forEach(param => {
            const value = url.searchParams.get(param);
            if (value) {
                params[param] = value;
            }
        });

        console.log("Processing request with params:", JSON.stringify(params, null, 2));

        // Get GeoJSON data
        const result = await handleGeographicImpactQuery(params);

        if (!result.success) {
            return json({
                type: "FeatureCollection",
                features: [],
                error: result.error || "Failed to get geographic impact data"
            }, {
                status: 500,
                headers: {
                    'Content-Type': 'application/geo+json',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // Transform the result into GeoJSON format
        const features = result.divisions.map(division => ({
            type: "Feature",
            geometry: division.geojson,
            properties: {
                id: division.id,
                name: division.name,
                values: result.values[division.id] || { totalDamage: 0, totalLoss: 0 }
            }
        }));

        // Return the GeoJSON with proper content type
        return json({
            type: "FeatureCollection",
            features
        }, {
            headers: {
                'Content-Type': 'application/geo+json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error("Error in geographic-impacts loader:", error);

        let status = 400;
        let message = "Bad request";

        if (error instanceof z.ZodError) {
            message = "Invalid parameters: " + error.errors.map(e => e.message).join(", ");
        } else if (error instanceof Error) {
            message = error.message;
            if (error.message.includes("Internal")) {
                status = 500;
            }
        }

        return json({
            type: "FeatureCollection",
            features: [],
            error: message
        }, {
            status,
            headers: {
                'Content-Type': 'application/geo+json',
                'Cache-Control': 'no-cache'
            }
        });
    }
};