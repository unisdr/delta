import * as turf from "@turf/turf";

export function convertTurfPolygon(
    polygonGeoJSON: turf.Feature<turf.Polygon | turf.MultiPolygon>
  ): turf.Feature<turf.Polygon | turf.LineString> | null {
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
        return turf.lineString(coordinates[0]);
      }
  
      // Ensure the polygon is closed (first and last points must match)
      const firstPoint = coordinates[0][0];
      const lastPoint = coordinates[0][coordinates[0].length - 1];
  
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates[0].push(firstPoint); // Close the polygon
      }
  
      return turf.polygon(coordinates);
    }
  
    console.warn("Unsupported geometry type! Expected Polygon.");
    return null;
}  

export function convertPolylineToTurfPolygon(
  polylineGeoJSON: turf.Feature<turf.LineString>
): turf.Feature<turf.LineString | turf.Polygon> | null {
  if (!polylineGeoJSON || !polylineGeoJSON.geometry) {
    return null;
  }
  const coordinates = polylineGeoJSON.geometry.coordinates;
  if (coordinates.length === 0) {
    return null;
  }
  if (coordinates.length === 1) {
    return turf.point(coordinates[0]); // Although a single point doesn't make sense for a polyline
  }
  if (coordinates.length === 2) {
    return turf.lineString(coordinates);
  }
  // For 3 or more points, return a Polygon
  const polyCoords = [...coordinates];
  if (
    polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] ||
    polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]
  ) {
    polyCoords.push(polyCoords[0]);
  }
  return turf.polygon([polyCoords]);
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

    return turf.polygon([points]);
}

export function convertRectangleToTurfPolygon(
    rectangleGeoJSON: turf.Feature<turf.Polygon>
): turf.Feature<turf.Polygon> | null {
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

        return turf.polygon(coordinates);
    }

    console.warn("Unsupported geometry type! Expected Polygon.");
    return null;
}

export function convertMarkersToTurfPolygon(
    markers: any[]
  ): turf.Feature<turf.Point | turf.LineString | turf.Polygon> | null {
    if (!markers || markers.length === 0) {
      return null; // No markers provided
    }
  
    // Convert Leaflet markers to GeoJSON coordinates format [lng, lat]
    const coordinates: [number, number][] = markers.map((marker) => {
      const { lat, lng } = marker.getLatLng();
      return [lng, lat]; // GeoJSON format
    });
  
    if (coordinates.length === 1) {
      return turf.point(coordinates[0]);
    }
  
    if (coordinates.length === 2) {
      return turf.lineString(coordinates);
    }
  
    // For 3 or more markers, form a Polygon. Make a shallow copy and close the polygon.
    const polyCoords = [...coordinates];
    if (
      polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] ||
      polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]
    ) {
      polyCoords.push(polyCoords[0]);
    }
    return turf.polygon([polyCoords]);
}

export function checkShapeAgainstDivisions(
    divisions: { id: string; name: string; geojson: any }[],
    shapeGeoJSON: turf.Feature<turf.Geometry>
) {
    if (divisions.length === 0) {
        return ""; // Return empty string if no divisions are provided
    }

    console.log('shapeGeoJSON.geometry.type:', shapeGeoJSON.geometry.type);

    // Step 1: Collect all division polygons
    const divisionPolygons: turf.Feature<turf.Geometry>[] = [];

    for (const division of divisions) {
        const divisionGeoJSON = division.geojson;
        const divisionPolygon: turf.Feature<turf.Geometry> =
            divisionGeoJSON.type === "MultiPolygon"
                ? turf.multiPolygon(divisionGeoJSON.coordinates)
                : turf.polygon(divisionGeoJSON.coordinates);

        divisionPolygons.push(divisionPolygon);
    }

    // Step 2: Merge all division polygons
    let mergedDivisionPolygon: turf.Feature<turf.Geometry> | null = null;

    if (divisionPolygons.length === 1) {
        mergedDivisionPolygon = divisionPolygons[0]; //If only one division, use it directly
    } else if (divisionPolygons.length > 1) {
        //Merge all polygons into one
        const combined = turf.combine(turf.featureCollection(divisionPolygons));
        mergedDivisionPolygon = combined.features.length === 1 ? combined.features[0] : null;
    }

    // Step 3: Debugging merged polygon
    //console.log("Merged Division Polygon:", JSON.stringify(mergedDivisionPolygon, null, 2));

    if (!mergedDivisionPolygon) {
        console.warn("⚠️ No valid divisions to check against!");
        return ""; // Return empty if no valid divisions exist
    }

    // Move Point Type Check Here (After `mergedDivisionPolygon` is Set)
    if (shapeGeoJSON.geometry.type === "Point") {
        if (turf.booleanPointInPolygon(shapeGeoJSON, mergedDivisionPolygon)) {
            console.log("The point is inside a division.");
            return ""; // Do nothing if the point is inside
        }
        return "⚠️ The point is completely outside of all divisions!";
    }

    if (shapeGeoJSON.geometry.type === "LineString") {
        const lineCoordinates = shapeGeoJSON.geometry.coordinates;
        let lineSomePartOutside = false;
        let lineCompletelyOutside = true;
    
        for (const [lng, lat] of lineCoordinates) {
            const point = turf.point([lng, lat]); // Convert each coordinate to a Point
    
            if (turf.booleanPointInPolygon(point, mergedDivisionPolygon)) {
                lineCompletelyOutside = false; //At least one point is inside
            } else {
                lineSomePartOutside = true; //Found a point outside
            }
        }
    
        if (lineCompletelyOutside) {
            return "⚠️ The entire line is outside of all divisions!";
        } else if (lineSomePartOutside) {
            return "⚠️ Some parts of the line extend outside the main divisions.";
        }
    
        return ""; //Fully inside, no warning needed
    }    

    //Step 4: First check if the shape is fully inside
    if (turf.booleanWithin(shapeGeoJSON, mergedDivisionPolygon)) {
        console.log("The shape is fully inside the divisions.");
        return ""; // Do not return a warning message if fully inside
    }

    //Step 5: If NOT fully inside, check for partial overlaps
    if (turf.booleanOverlap(shapeGeoJSON, mergedDivisionPolygon)) {
        return "⚠️ Some parts of the shape extend outside the main divisions.";
    }

    //Step 6: If neither condition is met, the shape is completely outside
    return "⚠️ The drawn shape is completely outside of all divisions!";
}




