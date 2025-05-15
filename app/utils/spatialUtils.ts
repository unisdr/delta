import { point, lineString, polygon } from "@turf/helpers";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { combine } from "@turf/combine";
import { featureCollection } from "@turf/helpers";
import { multiPolygon } from "@turf/helpers";
import { booleanWithin } from "@turf/boolean-within";
import { booleanClockwise } from "@turf/boolean-clockwise";
import { booleanOverlap } from "@turf/boolean-overlap";
import { Feature, Point, LineString, Polygon, MultiPolygon, Geometry, Position, FeatureCollection } from "geojson";

export function convertTurfPolygon(
    polygonGeoJSON: Feature<Polygon | MultiPolygon>
): Feature<Polygon | LineString> | null {
    // Check if it's a valid input
    if (!polygonGeoJSON || !polygonGeoJSON.geometry) {
      console.warn("Invalid polygon input!");
      return null;
    }
  
    if (polygonGeoJSON.geometry.type === "Polygon") {
      const coordinates = polygonGeoJSON.geometry.coordinates;
  
      // Ensure the polygon has at least one coordinate array
      if (coordinates.length === 0 || coordinates[0].length === 0) {
        console.warn("Empty polygon coordinates!");
        return null;
      }
  
      // If there are fewer than 4 points, return a LineString instead of a Polygon
      if (coordinates[0].length < 4) {
        console.warn("⚠️ Not enough points for a valid polygon, returning LineString.");
        return lineString(coordinates[0]);
      }
  
      // Ensure the polygon is closed (first and last points must match)
      const firstPoint = coordinates[0][0];
      const lastPoint = coordinates[0][coordinates[0].length - 1];
  
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates[0].push(firstPoint); // Close the polygon
      }
  
      return polygon(coordinates);
    }
  
    console.warn("Unsupported geometry type! Expected Polygon.");
    return null;
}  

export function convertPolylineToTurfPolygon(
    polylineGeoJSON: Feature<LineString>
  ): Feature<LineString | Polygon> | null {  
  if (!polylineGeoJSON || !polylineGeoJSON.geometry) {
    return null;
  }
  const coordinates = polylineGeoJSON.geometry.coordinates;
  if (coordinates.length === 0) {
    return null;
  }
  if (coordinates.length === 1) {
    return point(coordinates[0]) as any; // Although a single point doesn't make sense for a polyline
  }
  if (coordinates.length === 2) {
    return lineString(coordinates);
  }
  // For 3 or more points, return a Polygon
  const polyCoords = [...coordinates];
  if (
    polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] ||
    polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]
  ) {
    polyCoords.push(polyCoords[0]);
  }
  return polygon([polyCoords]);
}

export function convertCircleToTurfPolygon(center: { lat: number; lng: number }, radius: number, numSides = 64) {
    const points: [number, number][] = [];
    const earthRadius = 6371000; // Earth's radius in meters
    const centerLat = center.lat * (Math.PI / 180);
    const centerLng = center.lng * (Math.PI / 180);

    for (let i = 0; i < numSides; i++) {
        const angle = (i / numSides) * (2 * Math.PI);
        const dx = radius / earthRadius * Math.cos(angle);
        const dy = radius / earthRadius * Math.sin(angle);

        const newLat = centerLat + dy;
        const newLng = centerLng + (dx / Math.cos(centerLat));

        points.push([newLng * (180 / Math.PI), newLat * (180 / Math.PI)]);
    }

    // Close the polygon by repeating the first point
    points.push(points[0]);

    return polygon([points]);
}

export function convertRectangleToTurfPolygon(
    rectangleGeoJSON: Feature<Polygon>
): Feature<Polygon> | null {
    if (!rectangleGeoJSON || !rectangleGeoJSON.geometry) {
        console.warn("Invalid rectangle input!");
        return null;
    }

    if (rectangleGeoJSON.geometry.type === "Polygon") {
        let coordinates = rectangleGeoJSON.geometry.coordinates;

        // Ensure the rectangle is closed (first and last points should be identical)
        if (
            coordinates.length > 0 &&
            coordinates[0][0] !== coordinates[0][coordinates[0].length - 1]
        ) {
            coordinates[0].push(coordinates[0][0]); // Close the rectangle
        }

        return polygon(coordinates);
    }

    console.warn("Unsupported geometry type! Expected Polygon.");
    return null;
}

export function convertMarkersToTurfPolygon(
    markers: any[]
): Feature<Point | LineString | Polygon> | null {
    if (!markers || markers.length === 0) {
      return null; // No markers provided
    }
  
    // Convert Leaflet markers to GeoJSON coordinates format [lng, lat]
    const coordinates: [number, number][] = markers.map((marker) => {
      const { lat, lng } = marker.getLatLng();
      return [lng, lat]; // GeoJSON format
    });
  
    if (coordinates.length === 1) {
      return point(coordinates[0]);
    }
  
    if (coordinates.length === 2) {
      return lineString(coordinates);
    }
  
    // For 3 or more markers, form a Polygon. Make a shallow copy and close the polygon.
    const polyCoords = [...coordinates];
    if (
      polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] ||
      polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]
    ) {
      polyCoords.push(polyCoords[0]);
    }
    return polygon([polyCoords]);
}

export function validateCoordinateRanges(geoJson: any): { valid: boolean; error?: string } {
  if (!geoJson) {
    return { valid: false, error: 'No GeoJSON data provided' };
  }

  // Ensure we have a valid GeoJSON type
  if (!geoJson.type || !['Feature', 'FeatureCollection', 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(geoJson.type)) {
    return { valid: false, error: `Invalid GeoJSON type: ${geoJson.type}` };
  }

  // Validate coordinate ranges
  if (geoJson.type === 'Feature' || geoJson.type === 'FeatureCollection') {
    if (geoJson.geometry) {
      return validateCoordinateRanges(geoJson.geometry);
    } else {
      return { valid: false, error: 'No geometry in GeoJSON feature' };
    }
  }

  if (geoJson.type === 'Point' || geoJson.type === 'MultiPoint') {
    if (!Array.isArray(geoJson.coordinates) || geoJson.coordinates.length < 2) {
      return { valid: false, error: 'Invalid point coordinates' };
    }
    for (const coord of geoJson.coordinates) {
      if (coord[0] < -180 || coord[0] > 180 || coord[1] < -90 || coord[1] > 90) {
        return { valid: false, error: 'Coordinate out of range' };
      }
    }
  }

  if (geoJson.type === 'LineString' || geoJson.type === 'MultiLineString') {
    if (!Array.isArray(geoJson.coordinates) || geoJson.coordinates.length < 2) {
      return { valid: false, error: 'Invalid line string coordinates' };
    }
    for (const coord of geoJson.coordinates) {
      if (coord[0] < -180 || coord[0] > 180 || coord[1] < -90 || coord[1] > 90) {
        return { valid: false, error: 'Coordinate out of range' };
      }
    }
  }

  if (geoJson.type === 'Polygon' || geoJson.type === 'MultiPolygon') {
    if (!Array.isArray(geoJson.coordinates) || geoJson.coordinates.length < 3) {
      return { valid: false, error: 'Invalid polygon coordinates' };
    }
    for (const ring of geoJson.coordinates) {
      if (ring.length < 4) {
        return { valid: false, error: 'Invalid polygon ring' };
      }
      for (const coord of ring) {
        if (coord[0] < -180 || coord[0] > 180 || coord[1] < -90 || coord[1] > 90) {
          return { valid: false, error: 'Coordinate out of range' };
        }
      }
    }
  }

  return { valid: true };
}

export function checkShapeAgainstDivisions(
    divisions: { id: string; name: string; geojson: any }[],
    shapeGeoJSON: Feature<Point | LineString | Polygon | MultiPolygon>
) {
    if (divisions.length === 0) {
        return ""; // Return empty string if no divisions are provided
    }

    // Early validation for invalid shapes
    if (!shapeGeoJSON || !shapeGeoJSON.geometry) {
        console.warn("Invalid shape provided");
        return "⚠️ Invalid shape data";
    }

    // Step 1: Collect all division polygons with proper error handling
    const divisionPolygons: Feature<Polygon | MultiPolygon>[] = [];

    try {
        for (const division of divisions) {
            if (!division.geojson || !division.geojson.coordinates) {
                console.warn(`Invalid division data for ${division.name}`);
                continue;
            }

            const divisionGeoJSON = division.geojson;
            let divisionPolygon: Feature<Polygon | MultiPolygon>;

            try {
                divisionPolygon = divisionGeoJSON.type === "MultiPolygon"
                    ? multiPolygon(divisionGeoJSON.coordinates)
                    : polygon(divisionGeoJSON.coordinates);
                divisionPolygons.push(divisionPolygon);
            } catch (e) {
                console.warn(`Error creating polygon for division ${division.name}:`, e);
            }
        }
    } catch (e) {
        console.error("Error processing divisions:", e);
        return "⚠️ Error processing division boundaries";
    }

    if (divisionPolygons.length === 0) {
        return "⚠️ No valid division boundaries found";
    }

    // Step 2: Merge all division polygons with proper error handling
    let mergedDivisionPolygon: Feature<Polygon | MultiPolygon> | null = null;

    try {
        if (divisionPolygons.length === 1) {
            mergedDivisionPolygon = divisionPolygons[0];
        } else {
            const collection = featureCollection(divisionPolygons);
            const combined = combine(collection);
            mergedDivisionPolygon = combined.features.length === 1 ? combined.features[0] as Feature<Polygon | MultiPolygon> : null;
        }
    } catch (e) {
        console.error("Error merging division polygons:", e);
        return "⚠️ Error processing division boundaries";
    }

    if (!mergedDivisionPolygon) {
        console.warn("⚠️ No valid divisions to check against!");
        return "";
    }

    try {
        // Handle Point shapes
        if (shapeGeoJSON.geometry.type === "Point") {
            try {
                if (booleanPointInPolygon(shapeGeoJSON as Feature<Point>, mergedDivisionPolygon)) {
                    return "";
                }
                return "⚠️ The point is outside of all divisions";
            } catch (e) {
                console.warn("Error checking point in polygon:", e);
                return "";
            }
        }

        // Handle LineString shapes
        if (shapeGeoJSON.geometry.type === "LineString") {
            try {
                const lineCoordinates = shapeGeoJSON.geometry.coordinates;
                if (!Array.isArray(lineCoordinates) || lineCoordinates.length < 2) {
                    return "⚠️ Invalid line coordinates";
                }

                let pointsInside = 0;
                for (const coord of lineCoordinates) {
                    const testPoint = point(coord);
                    if (booleanPointInPolygon(testPoint, mergedDivisionPolygon)) {
                        pointsInside++;
                    }
                }

                if (pointsInside === 0) {
                    return "⚠️ The line is completely outside of divisions";
                } else if (pointsInside < lineCoordinates.length) {
                    return "⚠️ Parts of the line extend outside divisions";
                }
                return "";
            } catch (e) {
                console.warn("Error checking line coordinates:", e);
                return "";
            }
        }

        // Handle Polygon shapes
        if (shapeGeoJSON.geometry.type === "Polygon") {
            try {
                const coords = shapeGeoJSON.geometry.coordinates[0];
                if (!Array.isArray(coords) || coords.length < 4) {
                    return "⚠️ Invalid polygon: requires at least 3 points plus closing point";
                }

                if (booleanWithin(shapeGeoJSON as Feature<Polygon>, mergedDivisionPolygon)) {
                    return "";
                }

                // Check if any point of the polygon is inside the divisions
                let hasPointInside = false;
                for (const coord of coords) {
                    const testPoint = point(coord);
                    if (booleanPointInPolygon(testPoint, mergedDivisionPolygon)) {
                        hasPointInside = true;
                        break;
                    }
                }

                if (!hasPointInside) {
                    return "⚠️ The polygon is completely outside of divisions";
                }
                return "⚠️ Parts of the polygon extend outside divisions";
            } catch (e) {
                console.warn("Error checking polygon:", e);
                return "";
            }
        }

        return ""; // Return empty string for unsupported shape types
    } catch (e) {
        console.error("Error in shape validation:", e);
        return "⚠️ Error validating shape";
    }
}

export function rewindGeoJSON(feature: any): any {
  const rewindPolygon = (coords: number[][][]) => {
    return coords.map((ringGroup) => {
      // ringGroup = one polygon with outer + holes
      return ringGroup.map((ring: any, index: any) => {
        const isOuter = index === 0;
        const isClockwise = booleanClockwise(ring);
        if ((isOuter && isClockwise) || (!isOuter && !isClockwise)) {
          return [...ring].reverse();
        }
        return ring;
      });
    });
  };

  if (feature.geometry.type === "MultiPolygon") {
    const newCoords = rewindPolygon(feature.geometry.coordinates);
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: newCoords,
      },
    };
  }

  if (feature.geometry.type === "Polygon") {
    const ringGroup = [feature.geometry.coordinates]; // wrap for uniformity
    const newCoords = rewindPolygon(ringGroup)[0]; // unwrap
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: newCoords,
      },
    };
  }

  return feature;
}