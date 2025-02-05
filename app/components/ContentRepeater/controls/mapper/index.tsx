declare namespace L {
  export const map: any;
  export const tileLayer: any;
  export const Polygon: any;
  export const polyline: any;
  export const Polyline: any;
  export const circle: any;
  export const Circle: any;
  export const rectangle: any;
  export const Rectangle: any;
  export const latLng: any;
  export const LatLng: any;
  export const Draw: any;
  export const LeafletEvent: any;
  export const LeafletMouseEvent: any;
  export const DrawEvents: any;
  export const marker: any;
  export const Marker: any;
  export const icon: any;
  export const latLngBounds: any;
}

const glbMapperJS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const glbMapperCSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const glbColors = {
  polygon: "#0074D9",
  line: "#FF851B",
  rectangle: "#2ECC40",
  circle: "#FF4136",
  marker: "#85144b"
};
const glbMarkerIcon = {
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Replace with your marker icon if necessary
  iconSize: [20, 20],
  iconAnchor: [5, 20],
  popupAnchor: [0, -20],
  shadowUrl: null, // Remove shadow
  className: "custom-leaflet-marker", // Add a custom class
}

const setIsDialogMapOpen: any = () => {};
const dialogMapRef: any = { current: { showModal: () => {}, mapperField: null } };
const initializeMap: any = () => {};
const base_path: string = "";

export const renderMapperDialog = (
    id: string,
    dialogMapRef: any,
    mapRef: any,
    base_path: string,
    closeMapDialog: any,
    state: any,
    resetDrawing: any,
    enableDragging: any,
    disableDragging: any,
    handleRectangleMode: any,
    handleCircleMode: any,
    handleFieldChange: any,
    debug: boolean
) => {
    return (
        <dialog
        id={`${id}_mapper`}
        ref={dialogMapRef}
        className="dts-dialog content-repeater-mapper"
      >
        <div className="dts-dialog__content" style={{overflowY: "hidden"}}>
          <div className="dts-dialog__header" style={{justifyContent: "space-between"}}>
            <h2 className="dts-heading-2" style={{marginBottom: "0px"}}>Mapper</h2>
            <a type="button" aria-label="Close dialog" onClick={closeMapDialog} style={{ color: "#000" }}>
              <svg aria-hidden="true" focusable="false" role="img">
                <use href={`${base_path}/assets/icons/close.svg#close`}></use>
              </svg>
            </a>
          </div>
          <div>
            <div className="dts-form__body">
              <div className="mapper-menu" style={{display: "flex", justifyContent: "space-between", padding: "10px", background: "#777"}}>
                <input type="text" id={`${id}_mapper_search`} style={{flex: 1, marginRight: "10px"}} 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const mapperSearch = document.getElementById(`${id}_mapper_search`) as HTMLInputElement;
                    let query = "";
                    if (mapperSearch) {
                      query = mapperSearch.value;
                      if (!query) {
                        alert("Please enter a location to search.");
                        return;
                      }
                    }
                    fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`)
                    .then(response => response.json())
                    .then(data => {
                      if (data.length > 0) {
                        const { lat, lon, boundingbox } = data[0];
                  
                        if (boundingbox) {
                          // Use the bounding box to fit the map to the area
                          const [latMin, latMax, lonMin, lonMax] = boundingbox.map(Number);
                          const bounds = [
                            [latMin, lonMin], // Southwest corner
                            [latMax, lonMax], // Northeast corner
                          ];
                  
                          mapRef.current.fitBounds(bounds, { padding: [50, 50] }); // Adjust padding as needed
                          if (debug) console.log(`Moved to bounds: ${JSON.stringify(bounds)}`);
                        } else {
                          // If no bounding box, fall back to a default zoom level and center on the lat/lon
                          mapRef.current.setView([lat, lon], 14);
                          if (debug) console.log(`Moved to location: ${query} (${lat}, ${lon})`);
                        }
                      } else {
                        alert("Location not found. Try a different query.");
                      }
                    })
                    .catch(err => {
                      console.error("Error fetching location:", err);
                      alert("An error occurred while searching. Please try again.");
                    });                  

                    if (debug) console.log(dialogMapRef.current.querySelector(`#${id}_mapper_container`));
                  }
                }}
                placeholder="Type location and enter" />
                <select
                  id={`${id}_mapper_modeSelect`}
                  style={{ width: "20%", marginRight: "10px" }}
                  onChange={(e) => {
                    const newMode = e.target.value;
                    const newModeText = e.target.options[e.target.selectedIndex].text; // Get the text of the selected option
                    const lastMode = e.target.getAttribute("last_mode") || "moveMap"; // Default last_mode to "moveMap" initially
                    const lastModeText = [...e.target.options].find(
                      (option) => option.value === lastMode
                    )?.text || lastMode; // Get the text of the last_mode option
                  
                    // Check if there are points in the drawing
                    const hasDrawing = state.current.points.length > 0;
                  
                    // Ensure confirmation is prompted only for valid transitions
                    if (hasDrawing && newMode !== "moveMap" && lastMode !== "moveMap" && lastMode !== newMode) {
                      const confirmMessage = `Switching from "${lastModeText}" to "${newModeText}" will clear the current drawing. Do you want to proceed?`;
                      if (!window.confirm(confirmMessage)) {
                        e.target.value = lastMode; // Revert to the previous mode
                        return;
                      }
                  
                      resetDrawing(); // Reset the map only if confirmed
                    }
                  
                    // Ensure no lingering CREATED event listeners
                    if (mapRef?.current) {
                      mapRef.current.off(L.Draw.Event.CREATED);
                    }
                  
                    // Disable and cleanup any active drawing tools
                    if (state.current.rectangleHandle) {
                      state.current.rectangleHandle.disable();
                      state.current.rectangleHandle = null;
                    }
                    if (state.current.circleHandle) {
                      state.current.circleHandle.disable();
                      state.current.circleHandle = null;
                    }
                  
                    // Clear lingering drawing interactions
                    if (mapRef?.current?.dragging) {
                      mapRef.current.dragging.enable(); // Re-enable dragging to ensure no leftover drag states
                    }
                  
                    // Update the last_mode attribute only if newMode is not "moveMap"
                    if (newMode !== "moveMap") {
                      e.target.setAttribute("last_mode", newMode);
                    }
                  
                    // Update the state with the new mode
                    state.current.mode = newMode;
                  
                    // Update map interaction behavior and cursor style dynamically
                    if (mapRef?.current) {
                      const container = mapRef.current.getContainer();
                  
                      // Handle behavior for different modes
                      if (newMode === "moveMap") {
                        enableDragging(); // Enable dragging when in "moveMap" mode
                        container.style.cursor = ""; // Reset to default cursor (grab hand for Leaflet)
                      } else if (newMode === "drawRectangle") {
                        disableDragging();
                        handleRectangleMode(); // Initialize Rectangle drawing mode
                        container.style.cursor = "crosshair"; // Set crosshair cursor for drawing mode
                      } else if (newMode === "drawCircle") {
                        disableDragging();
                        handleCircleMode(); // Initialize Circle drawing mode
                        container.style.cursor = "crosshair"; // Set crosshair cursor for drawing mode
                      } else {
                        enableDragging(); // Allow dragging for "autoPolygon" and "drawLines"
                        container.style.cursor = "crosshair"; // Default crosshair cursor for drawing
                      }
                    }
                  
                    if (debug) console.log("Mode changed to:", state.current.mode);
                  }}
                                    
                >
                  <option value="moveMap">Move Map</option>
                  <option value="autoPolygon">Polygon</option>
                  <option value="drawLines">Line(s)</option>
                  <option value="drawRectangle">Rectangle</option>
                  <option value="drawCircle">Circle</option>
                  <option value="placeMarker">Marker(s)</option>
                </select>
              <div id={`${id}_mapper_buttons`} style={{display: "flex", gap: "10px"}}>
                  <button type="button" id={`${id}_mapper_clearCoords`} 
                  className="mg-button mg-button--small mg-button-system" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    resetDrawing();
                  
                    // Reinitialize the drawing mode if rectangle or circle is active
                    if (state.current.mode === "drawRectangle") {
                      handleRectangleMode();
                    } else if (state.current.mode === "drawCircle") {
                      handleCircleMode();
                    }
                  }}
                  >Clear</button>
                  <button type="button" id={`${id}_mapper_undoAction`} 
                  className="mg-button mg-button--small mg-button-system" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    const L = (window as any).L || null;

                    const mapperModeSelect = document.getElementById(`${id}_mapper_modeSelect`);
                    const currentMode = mapperModeSelect?.getAttribute('last_mode') || "moveMap"; // Fallback to "moveMap" if undefined
                  
                    if (state.current.points.length > 0 || state.current.rectangle || state.current.circle) {
                      if (currentMode === "autoPolygon") {
                        if (state.current.polygon) mapRef.current.removeLayer(state.current.polygon);
                        if (state.current.points.length > 0) {
                          state.current.points.pop();
                          if (state.current.points.length > 0) {
                            state.current.polygon = L.polygon(state.current.points, { color: 'red' }).addTo(mapRef.current);
                          }
                        }
                      } else if (currentMode === "drawLines") {
                        if (state.current.polyline) mapRef.current.removeLayer(state.current.polyline);
                        if (state.current.points.length > 0) {
                          state.current.points.pop();
                          if (state.current.points.length > 0) {
                            state.current.polyline = L.polyline(state.current.points, { color: 'blue' }).addTo(mapRef.current);
                          }
                        }
                      } else if (currentMode === "drawRectangle") {
                        if (state.current.rectangle) {
                          mapRef.current.removeLayer(state.current.rectangle);
                          state.current.rectangle = null;
                          state.current.points = []; // Reset points

                          disableDragging();
                          handleRectangleMode();

                          if (debug) console.log("Rectangle undone!");
                        }
                      } else if (currentMode === "drawCircle") {
                        if (state.current.circle) {
                          mapRef.current.removeLayer(state.current.circle);
                          state.current.circle = null;
                          state.current.points = []; // Reset points

                          disableDragging();
                          handleCircleMode();

                          if (debug) console.log("Circle undone!");
                        }
                      } else if (currentMode === "placeMarker") {
                        if (state.current.points.length > 0) {
                          // Remove the last marker from the map
                          const lastMarker = state.current.marker.pop(); // Remove the last marker
                          if (lastMarker) {
                            mapRef.current.removeLayer(lastMarker); // Remove the marker from the map
                          }
                      
                          // Remove the corresponding coordinates from points
                          state.current.points.pop();
                      
                          if (debug) console.log("Marker undone, remaining points:", state.current.points);
                        } else {
                          if (debug) console.log("No markers to undo!");
                        }
                      }
                    } else {
                      if (debug) console.log("No actions to undo!");
                    }
                  }}                  
                  >Undo</button>
                  <button type="button" id={`${id}_mapper_getCoords`} 
                  className="mg-button mg-button--small mg-button-primary" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    const field = dialogMapRef.current?.mapperField;
                  
                    if (!field) {
                      console.error("Field is not set on dialogMapRef.");
                      return;
                    }
                  
                    if (debug) console.log("Field passed to dialog:", field);
                  
                    const targetElement = field.domElement;

                    const saveGeoJSON = (geoJSON: string) => {
                      if (field?.mapperGeoJSONField) {
                        const geoJSONField = document.getElementById(`${id}_${field?.mapperGeoJSONField}`) as HTMLInputElement;
                        geoJSONField.value = geoJSON;
                        const setField = { id: field?.mapperGeoJSONField, value: geoJSON };
                        handleFieldChange(setField, geoJSON);
                      }
                    };
                  
                    let updatedValue = "";
                  
                    const normalizeLongitude = (lng: number) =>
                      ((lng + 180) % 360 + 360) % 360 - 180; // Normalize to [-180, 180]
                  
                    if (state.current.polygon) {
                      // Convert polygon LatLng objects to plain arrays and normalize
                      const polygonCoordinates = state.current.polygon
                        .getLatLngs()[0] // Leaflet polygons are arrays of arrays
                        .map((latLng: any) => [latLng.lat, normalizeLongitude(latLng.lng)]);
                  
                      if (debug) {
                        console.log(
                          "Polygon Coordinates (Normalized):",
                          JSON.stringify(polygonCoordinates)
                        );
                        console.log("Polygon GeoJSON:", JSON.stringify(state.current.polygon.toGeoJSON(), null, 2));
                      }
                  
                      updatedValue = JSON.stringify({
                        mode: "polygon",
                        coordinates: polygonCoordinates,
                      }); // Save as JSON object

                      saveGeoJSON(JSON.stringify(state.current.polygon.toGeoJSON(), null, 2));
                    } else if (state.current.polyline) {
                      // Convert polyline LatLng objects to plain arrays and normalize
                      const lineCoordinates = state.current.polyline
                        .getLatLngs()
                        .map((latLng: any) => [latLng.lat, normalizeLongitude(latLng.lng)]);
                  
                      if (debug) {
                        console.log(
                          "Line Coordinates (Normalized):",
                          JSON.stringify(lineCoordinates)
                        );
                        console.log("Polyline GeoJSON:", JSON.stringify(state.current.polyline.toGeoJSON(), null, 2));
                      }
                  
                      updatedValue = JSON.stringify({
                        mode: "lines",
                        coordinates: lineCoordinates,
                      }); // Save as JSON object

                      saveGeoJSON(JSON.stringify(state.current.polyline.toGeoJSON(), null, 2));
                    } else if (state.current.circle) {
                      // Get circle data
                      const center = state.current.circle.getLatLng();
                      const radius = state.current.circle.getRadius();
                  
                      const circleData = {
                        mode: "circle",
                        center: [center.lat, normalizeLongitude(center.lng)],
                        radius: radius,
                      };

                      function generateCirclePolygon(center: any, radius: any, points = 64) {
                          const coordinates = [];
                          for (let i = 0; i < points; i++) {
                              const angle = (i / points) * (2 * Math.PI);
                              const dx = radius * Math.cos(angle);
                              const dy = radius * Math.sin(angle);

                              // Convert meters to degrees (approximate conversion)
                              const deltaLat = dy / 111320;
                              const deltaLon = dx / (111320 * Math.cos(center.lat * (Math.PI / 180)));

                              coordinates.push([center.lng + deltaLon, center.lat + deltaLat]);
                          }
                          coordinates.push(coordinates[0]); // Close the polygon

                          return {
                              type: "Feature",
                              geometry: {
                                  type: "Polygon",
                                  coordinates: [coordinates]
                              },
                              properties: {}
                          };
                      }
                  
                      if (debug) { 
                        console.log("Circle Data:", JSON.stringify(circleData));
                        const circleGeoJSON = generateCirclePolygon(center, radius);
                        console.log("Circle GeoJSON (Polygon):", JSON.stringify(circleGeoJSON, null, 2));
                      }
                  
                      updatedValue = JSON.stringify(circleData); // Save as JSON object

                      saveGeoJSON(JSON.stringify(generateCirclePolygon(center, radius), null, 2));
                    } else if (state.current.rectangle) {
                      // Get rectangle data
                      const bounds = state.current.rectangle.getBounds();
                  
                      const rectangleData = {
                        mode: "rectangle",
                        coordinates: [
                          [ bounds.getNorthWest().lat, normalizeLongitude(bounds.getNorthWest().lng) ],
                          [ bounds.getSouthEast().lat, normalizeLongitude(bounds.getSouthEast().lng) ],
                        ],
                      };
                  
                      if (debug) { 
                        console.log("Rectangle Data:", JSON.stringify(rectangleData));
                        console.log("Rectangle GeoJSON:", JSON.stringify(state.current.rectangle.toGeoJSON(), null, 2));
                      }
                  
                      updatedValue = JSON.stringify(rectangleData); // Save as JSON object

                      saveGeoJSON(JSON.stringify(state.current.rectangle.toGeoJSON(), null, 2));
                    } else if (state.current.marker && Array.isArray(state.current.marker)) {
                      // Get marker data as an array of coordinates
                      const markerCoordinates = state.current.marker.map((marker: any) => [
                        marker.getLatLng().lat,
                        normalizeLongitude(marker.getLatLng().lng),
                      ]);
                  
                      const markerData = {
                        mode: "markers",
                        coordinates: markerCoordinates,
                      };

                      type GeoJSONFeatureCollection = {
                          type: "FeatureCollection";
                          features: GeoJSONFeature[];
                      };

                      type GeoJSONFeature = {
                          type: "Feature";
                          properties: Record<string, any>;
                          geometry: {
                              type: "Point";
                              coordinates: [number, number]; // [longitude, latitude]
                          };
                      };

                      /**
                       * Converts an array of Leaflet markers to a valid GeoJSON FeatureCollection.
                       * @param markers - An array of Leaflet Marker objects.
                       * @returns A valid GeoJSON FeatureCollection.
                       */
                      function convertMarkersToGeoJSON(markers: any[]): GeoJSONFeatureCollection {
                          const features: GeoJSONFeature[] = markers.map((marker) => {
                              const { lat, lng } = marker.getLatLng();
                              return {
                                  type: "Feature",
                                  properties: {}, // Add custom properties if needed
                                  geometry: {
                                      type: "Point",
                                      coordinates: [lng, lat], // GeoJSON uses [longitude, latitude]
                                  },
                              };
                          });

                          return {
                              type: "FeatureCollection",
                              features,
                          };
                      }

                      if (debug) {
                        console.log("Marker Data:", JSON.stringify(markerData));
                        const markerGeoJSON = convertMarkersToGeoJSON(state.current.marker);
                        console.log("Marker GeoJSON:", JSON.stringify(markerGeoJSON, null, 2));
                      }
                  
                      updatedValue = JSON.stringify(markerData); // Save as JSON object

                      saveGeoJSON(JSON.stringify(convertMarkersToGeoJSON(state.current.marker), null, 2));
                    } else {
                      if (debug) console.log("No shape created yet.");
                    }
                  
                    // Update the textarea value
                    targetElement.value = updatedValue;
                  
                    // Trigger the field's onChange handler
                    handleFieldChange(field, updatedValue);
                  
                    closeMapDialog();
                  }}                       
                  >Save Coordinates</button>
              </div>
              </div>
              <div className="mapper-holder">
                <div id={`${id}_mapper_container`} 
                style={{ flex: 1, width: "100%", height: "500px" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    )
}

export const previewMap = (items: any) => {
    const newTab = window.open("", "_blank");
  
    if (!newTab) {
      alert("Popup blocker is preventing the map from opening.");
      return;
    }
  
    newTab.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Map Preview</title>
        <link rel="stylesheet" href="${glbMapperCSS}" />
        <style>
          #map {
            position: relative;
            display: block;
            width: 100%;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="${glbMapperJS}"></script>
        <script>
          const adjustZoomBasedOnDistance = (map, bounds, centers) => {
            console.log(bounds);

            let maxDistance = 0;

            if (centers.length === 1) {
              // Calculate maxDistance for a single shape based on its bounds
              const singleShapeBounds = bounds.isValid() ? bounds : null;

              if (singleShapeBounds) {
                maxDistance = singleShapeBounds.getNorthEast().distanceTo(singleShapeBounds.getSouthWest());
              } else {
                console.warn("No valid bounds available for the single shape.");
                map.setView(centers[0], 14); // Default zoom for a single center if no bounds
                return;
              }
            } else {
              // Calculate the maximum distance between all centers
              for (let i = 0; i < centers.length; i++) {
                for (let j = i + 1; j < centers.length; j++) {
                  const distance = centers[i].distanceTo(centers[j]);
                  maxDistance = Math.max(maxDistance, distance);
                }
              }
            }

            // Define zoom level thresholds based on distances
            const globalLevelDistance = 10000000; // ~10,000km
            const regionalLevelDistance = 5000000; // ~5,000km
            const countryLevelDistance = 1000000; // ~1,000km
            const cityLevelDistance = 100000; // ~100km
            const townLevelDistance1 = 20000; // ~20km
            const townLevelDistance2 = 15000; // ~15km
            const townLevelDistance3 = 10000; // ~10km
            const townLevelDistance4 = 5000; // ~5km

            let calculatedZoom;

            // Adjust zoom based on maximum distance
            if (maxDistance > globalLevelDistance) {
              calculatedZoom = 2; // Minimum zoom for global scale
            } else if (maxDistance > regionalLevelDistance) {
              calculatedZoom = 4; // Regional scale
            } else if (maxDistance > countryLevelDistance) {
              calculatedZoom = 7; // Country-level zoom
            } else if (maxDistance > cityLevelDistance) {
              calculatedZoom = 10; // City-level zoom
            } else if (maxDistance > townLevelDistance1) {
              calculatedZoom = 11; // Town-level zoom
            } else if (maxDistance > townLevelDistance2) {
              calculatedZoom = 12; // Town-level zoom
            } else if (maxDistance > townLevelDistance3) {
              calculatedZoom = 13; // Town-level zoom
            } else if (maxDistance > townLevelDistance4) {
              calculatedZoom = 14; // Town-level zoom
            } else {
              calculatedZoom = 17; // Local zoom for nearby shapes
            }

            console.log("maxDistance:", maxDistance);
            console.log("calculatedZoom:", calculatedZoom);

            // Fit bounds first with padding
            map.fitBounds(bounds, {
              padding: [50, 50],
            });

            // Set the zoom level dynamically
            map.setZoom(Math.min(map.getZoom(), calculatedZoom));
          };

        window.onload = () => {
            document.getElementById("map").style.height = "${window.outerHeight - 100}px";

            const map = L.map("map").setView([43.833, 87.616], 2);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
            }).addTo(map);

            const items = ${items};
            const boundsArray = [];
            const centers = [];

            items.forEach((item) => {
                try {
                    const geojsonData = JSON.parse(item.geojson); // Replace map_coords with geojson

                    L.geoJSON(geojsonData, {
                        style: (feature) => ({
                            color: getColorForType(feature.geometry.type),
                            weight: 2,
                        }),
                        pointToLayer: (feature, latlng) => {
                            if (feature.geometry.type === "Point") {
                                return L.marker(latlng, {
                                    icon: L.icon(${JSON.stringify(glbMarkerIcon)}),
                                });
                            }
                            return L.circleMarker(latlng, {
                                radius: 5,
                                fillColor: getColorForType(feature.geometry.type),
                                color: "#000",
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                        },
                        onEachFeature: (feature, layer) => {
                            if (feature.geometry.type !== "Point") {
                                boundsArray.push(layer.getBounds());
                                centers.push(layer.getBounds().getCenter());
                            } else {
                                centers.push(layer.getLatLng());
                            }
                        },
                    }).addTo(map);
                } catch (error) {
                    console.error("Error parsing GeoJSON:", error);
                }
            });

            if (boundsArray.length > 0) {
                const bounds = L.latLngBounds(boundsArray.flat());
                adjustZoomBasedOnDistance(map, bounds, centers);
            } else {
                console.warn("No valid bounds available for fitting the map.");
            }
        };

        // Function to dynamically assign colors for different geometry types
        function getColorForType(geometryType) {
            const colors = {
                Point: "${glbColors.marker}",
                LineString: "${glbColors.line}",
                Polygon: "${glbColors.polygon}",
                MultiPolygon: "${glbColors.polygon}",
                MultiPoint: "${glbColors.marker}",
                MultiLineString: "${glbColors.line}",
            };
            return colors[geometryType] || "black";
        }
      </script>
      </body>
      </html>
    `);
    newTab.document.close();
}

export const previewGeoJSON = (items: any) => {
  const newWindow = window.open();
  if (newWindow) {
    newWindow.document.write(
      `<pre style="white-space: pre-wrap; word-break: break-word">${items}</pre>`
    );
    newWindow.document.close();
  }
}


export const renderMapper = (
  id: string,
  fieldId: string,
  field: any,
  value: string
) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1%' }}>
        <div
          id={`${id}_${fieldId}`}
          style={{
            position: "relative",
            width: "100%",
            padding: '0.4rem 0.8rem',
            backgroundColor: 'white',
            border: '1px solid #cccccc',
            borderRadius: '6px',
            color: '#999',
            minHeight: '3.5rem',
            overflow: 'hidden',
            cursor: "pointer",
          }}
        >  
          <a 
            style={{
              width: "auto",
              zIndex: "1000",
              textAlign: "center",
              padding: "0.7rem 0.8rem",
              color: "#000",
              textDecoration: "none",
              borderRadius: "4px",
              display: "inline-flex", // Use inline-flex for centering inline content
              alignItems: "center",   // Vertically center items
              justifyContent: "center", // Optional: Center items horizontally
              backgroundColor: "#cccccc",
              position: "absolute", top: "-2px", right: "-2px"
            }}
            onClick={() => {
              setIsDialogMapOpen(true);
              dialogMapRef.current?.showModal();
              dialogMapRef.current.mapperField = field;
              initializeMap(value ? JSON.parse(value) : null);
            }}
          >
            <img 
              src={`${base_path}/assets/icons/globe.svg`}
              alt="Globe SVG File" 
              title="Globe SVG File" 
              style={{ width: "20px", height: "20px", marginRight: "0.5rem" }} // Adjust size and spacing
            /> 
            Open Map
          </a>                    
          {value &&
          (() => {
            try {
              const parsedValue = JSON.parse(value); // Parse JSON object
              if (parsedValue && parsedValue.mode) {
                const { mode, coordinates, center, radius } = parsedValue;

                const title = `Shape: ${mode.toUpperCase()}`;

                if (mode === "circle" && center && radius) {
                  // Handle circle mode
                  return (
                    <div
                      style={{
                        fontSize: "1rem",
                        margin: "0.5rem",
                        padding: "1rem",
                        position: "relative",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                      }}
                      title={title}
                      onClick={() => {
                        const newWindow = window.open();
                        if (newWindow) {
                          newWindow.document.write(
                            `<pre>${JSON.stringify(parsedValue, null, 2)}</pre>`
                          );
                          newWindow.document.close();
                        }
                      }}
                    >
                      <h4>{title}</h4>
                      <ul>
                        <li>
                          Center: Lat {center[0]}, Lng {center[1]}
                        </li>
                        <li>Radius: {radius.toFixed(2)} meters</li>
                      </ul>
                    </div>
                  );
                } else if (Array.isArray(coordinates)) {
                  // Handle polygons, rectangles, or lines
                  return (
                    <div
                      style={{
                        fontSize: "1rem",
                        margin: "0.5rem",
                        padding: "1rem",
                        position: "relative",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                      }}
                      title={title}
                      onClick={() => {
                        const newWindow = window.open();
                        if (newWindow) {
                          newWindow.document.write(
                            `<pre>${JSON.stringify(parsedValue, null, 2)}</pre>`
                          );
                          newWindow.document.close();
                        }
                      }}
                    >
                      <h4>{title}</h4>
                      <ul>
                        {coordinates.map((coordinate, index) => (
                          <li key={index}>
                            Lat: {coordinate[0]}, Lng: {coordinate[1]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
              }

              return <pre>{value}</pre>; // Fallback for invalid structures
            } catch (err) {
              console.error("Failed to parse value:", err);
              return <pre>Invalid data</pre>;
            }
          })()}
        </div>
      </div>  
    </div>
  )
}

