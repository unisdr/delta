import React from "react";

type SpatialFootprintsMapViewerProps = {
    dataSource: { id: string }[]; // Define a stricter type for dataSource
    filterCaption?: string;
    ctryIso3?: string;
};

const glbMapperJS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const glbMapperCSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const glbColors = {
  polygon: "#0074D9",
  line: "#FF851B",
  rectangle: "#2ECC40",
  circle: "#FF4136",
  marker: "#85144b",
  geographic_level: "#fc9003",
};
const glbMarkerIcon = {
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [20, 20],
  iconAnchor: [5, 20],
  popupAnchor: [0, -20],
  shadowUrl: null,
  className: "custom-leaflet-marker",
};

const SpatialFootprintsMapViewer: React.FC<SpatialFootprintsMapViewerProps> = ({
  dataSource = [],
  filterCaption = "",
  ctryIso3 = "",
}) => {
    const defaultMapLocation = async (): Promise<{ coords: [number, number]; bounds?: [[number, number], [number, number]] }> => {
        const iso3 = ctryIso3; // Default country code
        const apiUrl = `https://data.undrr.org/api/json/gis/countries/1.0.0/?cca3=${iso3}`;
    
        // Default location (Urumqi)
        const defaultCoords: [number, number] = [43.833, 87.616];
    
        try {
            if (!iso3) throw new Error("Country ISO3 code is missing");
    
            // Step 1: Fetch Country Data (API)
            const responseCountry = await fetch(apiUrl);
            if (!responseCountry.ok) throw new Error(`Failed to fetch country data: ${responseCountry.statusText}`);
    
            const dataCountry = await responseCountry.json();
            if (!dataCountry?.data?.length) throw new Error(`Country API returned no data for ${iso3}`);
    
            const cca2 = dataCountry.data[0]?.cca2;
            if (!cca2) throw new Error(`Country code not found for ${iso3}`);
    
            // Step 2: Fetch Country Center & Bounds from Nominatim
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?country=${cca2}&format=json&limit=1&polygon_geojson=1`;
            const responseNominatim = await fetch(nominatimUrl);
            
            if (!responseNominatim.ok) throw new Error(`Failed to fetch Nominatim data: ${responseNominatim.statusText}`);
    
            // ✅ Proof-Check: Ensure valid JSON and non-empty array
            let dataNominatim;
            try {
                dataNominatim = await responseNominatim.json();
                if (!Array.isArray(dataNominatim) || dataNominatim.length === 0) {
                    throw new Error(`Nominatim returned an empty result for ${cca2}`);
                }
            } catch (parseError) {
                throw new Error(`Failed to parse Nominatim JSON: ${parseError}`);
            }
    
            const { lat, lon, boundingbox } = dataNominatim[0];
    
            return {
                coords: [parseFloat(lat), parseFloat(lon)], // Extract coordinates
                bounds: [
                    [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])], // Southwest
                    [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]  // Northeast
                ]
            };
    
        } catch (error) {
            console.error("Error fetching country/location data:", error);
            return { coords: defaultCoords }; // 🚀 Immediate fallback!
        }
    };

  const previewMap = async (items: any[], legendData: any[], defaultKeys: string[], missing: any[] = [], eventId: string = "") => {
    const newTab = window.open("", "_blank");
    if (!newTab) {
      alert("Popup blocker is preventing the map from opening.");
      return;
    }

    const { coords } = await defaultMapLocation();
    const strCoords = JSON.stringify(coords);

    newTab.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Map Preview</title>
        <link rel="stylesheet" href="${glbMapperCSS}" />
        <script src="${glbMapperJS}"></script>
        <style>
            body { font-family: Arial, sans-serif; }

            #map { 
                width: 100%; 
                height: 100vh; 
            }

            #legend {
                position: absolute;
                bottom: 20px;
                right: 20px;
                background-color: rgba(255, 255, 255, 0.9);
                padding: 10px;
                border-radius: 5px;
                font-size: 13px;
                z-index: 1000;
                width: 250px;  /* Fixed width */
                height: 300px;  /* Fixed height for the entire container */
                overflow: hidden; /* Prevent container from growing */
            }

            #legend h4 {
                margin: 0;
                padding: 0;
                font-size: 16px;
                font-weight: bold;
                cursor: move; /* Show move cursor */
                background-color: rgba(255, 255, 255, 0.9);
            }

            #legend .legend-body {
                overflow-y: auto;  /* Allow scrolling */
                height: 250px;  /* Fixed height for the body section */
                padding-top: 10px;
            }

            .legend-item { 
                margin-bottom: 5px; 
            }

            .legend-subitem {
                margin-left: 20px;
                font-style: italic;
            }

            input[type="checkbox"] {
                margin-right: 5px;
            }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="legend">
            <h4 id="legend-header">${filterCaption || "Map Layers"}</h4>
            <div class="legend-body">
                <div class="legend-item">
                <input type="checkbox" id="layer-event" ${defaultKeys.includes("event") ? "checked" : ""} />
                <label for="layer-event">Disaster Event - ${eventId}</label>
                </div>
                ${(legendData.length > 0) ? '<div for="layer-record" style="margin-top: 0.5rem; padding-left: 0.2rem">Disaster Records</div>' : ""}
                ${legendData
                .map(
                    (rec) => `
                    <div class="legend-item">
                        <input type="checkbox" id="layer-${rec.id}" ${defaultKeys.includes(rec.id) ? "checked" : ""} />
                        <label for="layer-${rec.id}">${rec.id.slice(0, 5)}</label>
                        ${["damages", "losses", "disruptions"]
                        .map(
                            (sub) => `
                            <div class="legend-subitem">
                            <input type="checkbox" id="layer-${rec.id}-${sub}" />
                            <label for="layer-${rec.id}-${sub}">${sub}</label>
                            </div>`
                        )
                        .join("")}
                    </div>`
                )
                .join("")}
            </div>
        </div>

        <script>
            const hasValidGeometry = (g) =>
            g?.type === "Feature" && g.geometry && Object.keys(g.geometry).length ||
            g?.type === "FeatureCollection" && g.features?.some((f) => f.geometry && Object.keys(f.geometry).length);


          const adjustZoomBasedOnDistance = (map, layerGroups) => {
            const boundsArray = [];

            console.log('layerGroups:',layerGroups);

            layerGroups.forEach(group => {
              if (map.hasLayer(group) && group.getLayers().length > 0) {
                group.eachLayer(layer => {
                  if (layer.getBounds && layer.getBounds().isValid()) {
                    boundsArray.push(layer.getBounds());
                  } else if (layer.getLatLng) {
                    boundsArray.push(L.latLngBounds([layer.getLatLng()]));
                  }
                });
              }
            });

            if (boundsArray.length > 0) { 
              const bounds = L.latLngBounds(boundsArray.flat());
              if (bounds.isValid()) {
                const dist = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
                if (dist < 5000) {
                  map.setView(bounds.getCenter(), 10);
                } else {
                  map.fitBounds(bounds, { padding: [50, 50] });
                }
              }
            } else {
                map.setView(${strCoords}, 6); 
            }
          };

          window.onload = () => {
            const map = L.map("map");
            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "" }).addTo(map);

            const items = ${JSON.stringify(items)};
            const defaultKeys = ${JSON.stringify(defaultKeys)};
            const missing = ${JSON.stringify(missing)};
            const layers = {};

            const getColor = (type) => ({
              event: "${glbColors.geographic_level}",
              damages: "${glbColors.circle}",
              losses: "${glbColors.rectangle}",
              disruptions: "${glbColors.line}",
            }[type] || "black");

            const renderGeoJson = (geojson, type) => {
                return L.geoJSON(geojson, {
                    style: function (feature) {
                        // Check if the GeoJSON is for division (you can check by a property or type)
                        const isDivisionLayer = feature?.properties?.division_id;  // Assuming division_id indicates division layers

                        // If it's a division layer, apply gray and dotted style
                        if (isDivisionLayer) {
                            return {
                            color: "gray",    // Set color to gray
                            weight: 1,        // Line weight (thickness)
                            dashArray: "2,2",  // Dotted line (5px dash, 5px gap)
                            fillColor: 'transparent', // optional
                            fillOpacity: 0       // make the inside transparent
                            };
                        }

                        // Otherwise, use the default style for other layers
                        const gType = feature?.geometry?.type;
                        return gType !== "Point" ? { color: getColor(type), weight: 2 } : undefined;
                    },
                    pointToLayer: function (feature, latlng) {
                        const marker = L.marker(latlng, {
                            icon: L.icon(${JSON.stringify(glbMarkerIcon)})
                        });

                        // Bind popup only for markers with a description
                        if (feature?.properties?.description) {
                            marker.bindPopup(feature.properties.description);
                        }

                        return marker;
                    }
                });
            };

            //console.log('items:',items);

            items.forEach((item) => {
            const key = item.type === "event"
                ? "event"
                : item.type === "footprint"
                ? item.record_id
                : \`\${item.record_id}-\${item.type}\`;

                console.log('key:',key);

            if (hasValidGeometry(item.geojson)) {
                const geojson = renderGeoJson(item.geojson, item.type);

                if (!layers[key]) { 
                    layers[key] = L.layerGroup();
                }

                layers[key].addLayer(geojson);

                if (defaultKeys.includes(key)) {
                    layers[key].addTo(map);
                }
            } else {
                console.warn("❌ Invalid geometry skipped for key:", key, item.geojson);
            }
            });

            const keyOf = function(item) {
            return item.type === "event" ? "event" : item.record_id + "-" + item.type;
            };

            const lazyLoadMissingGeometries = () => {
            console.log("🔍 Lazy loading missing geometries:", missing);

            missing.forEach((item) => {
                const { type, record_id, geojson, division_id } = item;

                const key =
                type === "event"
                    ? "event"
                    : type === "footprint"
                    ? record_id
                    : \`\${record_id}-\${type}\`;

                console.log("📦 Fetching geometry for key:", key);

                fetch("/api/spatial-footprint-geojson?division_id=" + division_id + "&record_id=" + record_id)
                .then((res) => res.json())
                .then((geo) => {
                    if (!geo || !geo.geometry) {
                    console.warn("⚠️ Geometry missing or empty for key:", key, geo);
                    return;
                    }

                    geojson.geometry = geo.geometry;

                    const layer = renderGeoJson(geojson, type);

                    if (!layers[key]) layers[key] = L.layerGroup();
                    layers[key].addLayer(layer);

                    console.log("✅ Lazy-loaded layer added to key:", key, "Current keys:", Object.keys(layers));

                    const checkbox = document.getElementById("layer-" + key);
                    if (checkbox && checkbox.checked) {
                    console.log("⏪ Dispatching existing onchange for:", key);
                    checkbox.dispatchEvent(new Event("change"));
                    }

                })
                .catch((err) => {
                    console.error("❌ Fetch failed for", division_id, err);
                });
            });
            };


            document.getElementById("layer-event").onchange = function () {
                const key = "event";
                if (layers[key]) {
                    map[this.checked ? "addLayer" : "removeLayer"](layers[key]);
                }
            };

            ${legendData
                .map(
                  (rec) => `
                  (() => {
                    const base = "${rec.id}";
              
                    // Disaster record's main footprint layer toggle
                    const groupCb = document.getElementById("layer-" + base);
                    if (!groupCb) {
                      console.warn("Missing group checkbox for:", base);
                      return;
                    }
              
                    groupCb.onchange = () => {
                        const groupKey = base; // main footprint layer key
                        const isChecked = groupCb.checked;

                        console.log("Group toggled:", groupKey, "Checked:", isChecked);

                        // Toggle the group's own main footprint layer
                        if (layers[groupKey]) {
                            map[isChecked ? "addLayer" : "removeLayer"](layers[groupKey]);
                        } else {
                            console.warn("Main footprint layer not found for:", groupKey);
                        }

                        // Toggle sublayers: damages, losses, disruptions
                        ["damages", "losses", "disruptions"].forEach((sub) => {
                            const subKey = \`\${groupKey}-\${sub}\`;
                            const subCb = document.getElementById("layer-" + subKey);

                            if (subCb) {
                            subCb.checked = isChecked;

                            if (layers[subKey]) {
                                map[isChecked ? "addLayer" : "removeLayer"](layers[subKey]);
                            } else {
                                console.log("🕐 Waiting for lazy-loaded layer:", subKey);
                                const interval = setInterval(() => {
                                if (layers[subKey]) {
                                    console.log("✅ Lazy-loaded layer now ready. Applying toggle:", subKey);
                                    map[isChecked ? "addLayer" : "removeLayer"](layers[subKey]);
                                    clearInterval(interval);
                                }
                                }, 50); // retry every 50ms
                            }
                            } else {
                            console.warn("⚠️ Sublayer checkbox not found for:", subKey);
                            }
                        });

                        adjustZoomBasedOnDistance(map, Object.values(layers));
                    };
              
                    // Individual sublayers
                    ["damages", "losses", "disruptions"].forEach((sub) => {
                      const key = \`\${base}-\${sub}\`;
                      const cb = document.getElementById("layer-" + key);
              
                      if (!cb) {
                        console.warn("Missing checkbox for sublayer:", key);
                        return;
                      }
              
                      cb.onchange = () => {
                        console.log("Sublayer toggled:", key, "Checked:", cb.checked);
                        if (layers[key]) {
                          map[cb.checked ? "addLayer" : "removeLayer"](layers[key]);
                        } else {
                          console.warn("Layer not found for:", key);
                        }
                      };
                    });
                  })();`
                )
                .join("")}              

            setTimeout(() => {
                console.log('layers after setTimeout:',layers);
                adjustZoomBasedOnDistance(map, Object.values(layers));
                lazyLoadMissingGeometries();

                setTimeout(() => {
                  // Remove attribution links
                  const attributionElement = document.querySelector(".leaflet-control-attribution.leaflet-control a");
                  if (attributionElement) {
                    attributionElement.remove();
                  }
                }, 50);
            }, 300);
          };

            const makeLegendDraggable = () => {
                // Correct the reference for the legend container
                const legend = document.getElementById("legend");  // Use this directly
                const legendHeader = document.getElementById("legend-header");  // Correct header ID

                if (!legend || !legendHeader) return;

                let offsetX = 0, offsetY = 0, isDragging = false;

                legendHeader.style.cursor = "move";  // Show the move cursor for dragging

                // Track the initial mouse position when drag starts
                legendHeader.onmousedown = (e) => {
                    isDragging = true;
                    offsetX = e.clientX - legend.getBoundingClientRect().left;
                    offsetY = e.clientY - legend.getBoundingClientRect().top;

                    document.onmousemove = (e) => {
                        if (!isDragging) return;

                        // Calculate the new position of the legend
                        let newLeft = e.clientX - offsetX;
                        let newTop = e.clientY - offsetY;

                        // **Prevent dragging out of viewport** (ensure it's within the window)
                        const maxLeft = window.innerWidth - legend.offsetWidth;
                        const maxTop = window.innerHeight - legend.offsetHeight;

                        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                        newTop = Math.max(0, Math.min(newTop, maxTop));

                        // Apply the new position
                        legend.style.left = \`\${newLeft}px\`;
                        legend.style.top = \`\${newTop}px\`;
                    };

                    document.onmouseup = () => {
                        isDragging = false;
                        document.onmousemove = null;
                        document.onmouseup = null;
                    };
                };
            };

            makeLegendDraggable();
        </script>
      </body>
      </html>
    `);

    newTab.document.close();
  };

  const handlePreview = (e: any) => {
    e.preventDefault();
  
    const structuredData: {
      event: any[];
      records: {
        id: string;
        footprint: any[];
        damages: any[];
        losses: any[];
        disruptions: any[];
      }[];
    } = { event: [], records: [] };
  
    const legendData: { id: string }[] = [];
    let eventId: string | null = null;
    const defaultKeys: string[] = [];
  
    const missing: {
      type: string;
      record_id?: string;
      geojson: any;
      division_id?: string;
    }[] = [];
  
    const hasValidGeometry = (g: any) =>
      g?.type === "Feature" && g.geometry && Object.keys(g.geometry).length ||
      g?.type === "FeatureCollection" && g.features?.some((f: any) => f.geometry && Object.keys(f.geometry).length);

      console.log('dataSource:',dataSource);

    if (dataSource.length > 0) {
      eventId = dataSource[0]?.id.slice(0, 5); // Add optional chaining to handle undefined cases
    }
  
    dataSource.forEach((event: any) => {
      event.event_spatial_footprint?.forEach((sf: any) => {
        if (sf.geojson) {
          if (hasValidGeometry(sf.geojson)) {
            structuredData.event.push(sf.geojson);
          } else {
            missing.push({
              type: "event",
              geojson: sf.geojson,
              division_id: sf.geojson.properties?.division_id
            });
          }
        }
      });
  
      event.disaster_records?.forEach((record: any) => {
        const id = record.id;
        const entry = { id, footprint: [], damages: [], losses: [], disruptions: [] };
  
        record.spatial_footprint?.forEach((sf: any) => {
          if (sf.geojson) {
            if (hasValidGeometry(sf.geojson)) {
                (entry.footprint as any[]).push(sf.geojson);
            } else {
              missing.push({
                type: "footprint",
                record_id: id,
                geojson: sf.geojson,
                division_id: sf.geojson.properties?.division_id
              });
            }
          }
        });
  
        record.damages?.forEach((d: any) => d.spatial_footprint?.forEach((sf: any) => {
          if (sf.geojson) {
            if (hasValidGeometry(sf.geojson)) {
              (entry.damages as any[]).push(sf.geojson);
            } else {
              missing.push({
                type: "damages",
                record_id: id,
                geojson: sf.geojson,
                division_id: sf.geojson.properties?.division_id
              });
            }
          }
        }));
  
        record.losses?.forEach((l: any) => l.spatial_footprint?.forEach((sf: any) => {
          if (sf.geojson) {
            if (hasValidGeometry(sf.geojson)) {
              (entry.losses as any[]).push(sf.geojson);
            } else {
              missing.push({
                type: "losses",
                record_id: id,
                geojson: sf.geojson,
                division_id: sf.geojson.properties?.division_id
              });
            }
          }
        }));
  
        record.disruption?.forEach((di: any) => di.spatial_footprint?.forEach((sf: any) => {
          if (sf.geojson) {
            if (hasValidGeometry(sf.geojson)) {
              (entry.disruptions as any[]).push(sf.geojson);
            } else {
              missing.push({
                type: "disruptions",
                record_id: id,
                geojson: sf.geojson,
                division_id: sf.geojson.properties?.division_id
              });
            }
          }
        }));
  
        structuredData.records.push(entry);
        legendData.push({ id });
      });
    });
  
    const flatItems = [
        ...structuredData.event.map((geojson) => ({ type: "event", geojson })),
        ...structuredData.records.flatMap((rec) => [
          ...rec.footprint.map((geojson) => ({ type: "footprint", record_id: rec.id, geojson })), // 👈 ALL footprints
          ...rec.damages.map((geojson) => ({ type: "damages", record_id: rec.id, geojson })),
          ...rec.losses.map((geojson) => ({ type: "losses", record_id: rec.id, geojson })),
          ...rec.disruptions.map((geojson) => ({ type: "disruptions", record_id: rec.id, geojson }))
        ])
      ];      
  
    // Set default visible layer
    if (structuredData.event.length) {
      defaultKeys.push("event");
    } else {
      const firstValidRecord = structuredData.records.find((r) => r.footprint.length > 0);
      if (firstValidRecord) defaultKeys.push(firstValidRecord.id);
    }

    const s_legendData = sanitizeLegendData(legendData);

    // console.log("flatItems:", flatItems);
    // console.log("legendData:", s_legendData);
    // console.log("defaultKeys:", defaultKeys);
    console.log("eventId:", eventId);
  
   //console.log("🧩 Missing geometries to be lazily loaded:", missing); // ← Log here
    previewMap(flatItems, s_legendData, defaultKeys, missing, eventId || "");
  };  

  return (
    <button
      onClick={handlePreview}
      style={{
        padding: "10px 16px",
        border: "1px solid rgb(221, 221, 221)",
        backgroundColor: "rgb(244, 244, 244)",
        color: "rgb(51, 51, 51)",
        fontSize: "14px",
        fontWeight: "normal",
        borderRadius: "4px",
        marginBottom: "2rem",
        cursor: "pointer",
      }}
    >
      Map Preview
    </button>
  );
};

function sanitizeLegendData(data: any[]): any[] {
    if (
      Array.isArray(data) &&
      data.length === 1 &&
      data[0]?.id === null
    ) {
      return [];
    }
    return data;
}
  
export default SpatialFootprintsMapViewer;
  
  