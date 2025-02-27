import React from "react";

type SpatialFootprintMapViewerProps = {
  dataSource: any; // Replace with a stricter type if available
    filterCaption?: string;
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

const SpatialFootprintMapViewer: React.FC<SpatialFootprintMapViewerProps> = ({
    dataSource = [],
    filterCaption = "",
}) => {
    const previewMap = (items: any) => {
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
            <script src="${glbMapperJS}"></script>
            <style>
              body { font-family: Arial, sans-serif; }
              #map { position: relative; width: 100%; height: 100vh; }
    
              /* Floating Legend Styling */
              #legend {
                position: absolute;
                bottom: 20px;
                right: 20px;
                background-color: rgba(200, 200, 200, 0.9);
                padding: 10px;
                border-radius: 5px;
                box-shadow: 0px 0px 5px rgba(0,0,0,0.3);
                font-size: 14px;
                z-index: 1000;
              }
              #legend h4 {
                margin: 0 0 8px;
                font-weight: bold;
                text-align: center;
                border-bottom: 1px solid #555;
                padding-bottom: 5px;
              }
              .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
              }
              .legend-item input { margin-right: 8px; }
            </style>
          </head>
          <body>
            <div id="map"></div>
            <div id="legend">
              <h4>${filterCaption}</h4>
              <div class="legend-item">
                <input type="checkbox" id="toggleDisaster" checked />
                <label for="toggleDisaster">Disaster Record</label>
              </div>
              <div class="legend-item">
                <input type="checkbox" id="toggleDamages" checked />
                <label for="toggleDamages">Damages</label>
              </div>
              <div class="legend-item">
                <input type="checkbox" id="toggleLosses" checked />
                <label for="toggleLosses">Losses</label>
              </div>
              <div class="legend-item">
                <input type="checkbox" id="toggleDisruptions" checked />
                <label for="toggleDisruptions">Disruptions</label>
              </div>
            </div>
    
            <script>
                const adjustZoomBasedOnDistance = (map, layerGroups) => {
                    const boundsArray = [];
    
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
                            const corners = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
    
                            if (corners < 5000) {  
                                map.setView(bounds.getCenter(), 10); // Prevent over-zooming
                            } else {
                                map.fitBounds(bounds, { padding: [50, 50] });
                            }
                        }
                    } else {
                        console.warn("No valid bounds to fit the map.");
                        map.setView([11.3233, 124.9200], 6);  // Default view if no layers are visible
                    }
                };
    
              window.onload = () => {
                const map = L.map("map").setView([11.3233, 124.9200], 6);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                  attribution: "&copy; OpenStreetMap contributors",
                }).addTo(map);
    
                const items = JSON.parse(\`${items}\`);
                
                // ✅ Layer Groups
                const layers = {
                  disaster: L.layerGroup().addTo(map),
                  damages: L.layerGroup().addTo(map),
                  losses: L.layerGroup().addTo(map),
                  disruptions: L.layerGroup().addTo(map),
                };
    
                // ✅ Define Colors for Each Type
                const getColorForType = (type) => ({
                  disaster: "${glbColors.polygon}",
                  damages: "${glbColors.circle}",
                  losses: "${glbColors.rectangle}",
                  disruptions: "${glbColors.line}",
                }[type] || "black");
    
                // ✅ Populate Layers
                items.forEach((item) => {
                  try {
                    const type = item.type;
                    const geojsonLayer = L.geoJSON(item.geojson, {
                      style: () => ({
                        color: getColorForType(type),
                        fillColor: getColorForType(type),
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
                          color: getColorForType(type),
                          fillColor: getColorForType(type),
                          weight: 1,
                          opacity: 1,
                          fillOpacity: 0.8
                        });
                      }
                    });
    
                    layers[type]?.addLayer(geojsonLayer);
                  } catch (error) {
                    console.error("Error parsing GeoJSON:", error);
                  }
                });
    
                // ✅ Initial Zoom Adjustment
                setTimeout(() => adjustZoomBasedOnDistance(map, Object.values(layers)), 500);
    
                // ✅ Checkbox Event Listeners (Trigger Zoom Adjustment)
                const toggleLayer = (id, layer) => {
                  document.getElementById(id).addEventListener("change", (e) => {
                    if (e.target.checked) {
                      map.addLayer(layer);
                    } else {
                      map.removeLayer(layer);
                    }
                    adjustZoomBasedOnDistance(map, Object.values(layers));
                  });
                };
    
                toggleLayer("toggleDisaster", layers.disaster);
                toggleLayer("toggleDamages", layers.damages);
                toggleLayer("toggleLosses", layers.losses);
                toggleLayer("toggleDisruptions", layers.disruptions);
              };
            </script>
          </body>
          </html>
        `);
    
        newTab.document.close();
    };

    const handlePreview = () => {
        const spatialData = [
          //Disaster Record (Assign "disaster" type)
          ...(dataSource[0]?.disaster_spatial_footprint || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            geojson: item.geojson,  // Directly get geojson
            map_coords: item.map_coords || {},
            type: "disaster"  //Add type for filtering
          })),
      
          //Extract spatial_footprint from disruptions, losses, and damages
          ...[
            ...dataSource[0]?.disruptions?.map((item: any) => ({
              ...item,
              type: "disruptions",  //Assign "disruptions" type
            })) || [],
            ...dataSource[0]?.losses?.map((item: any) => ({
              ...item,
              type: "losses",  //Assign "losses" type
            })) || [],
            ...dataSource[0]?.damages?.map((item: any) => ({
              ...item,
              type: "damages",  //Assign "damages" type
            })) || [],
          ].flatMap(item =>
            item.spatial_footprint.map((sf: any) => ({
              id: sf.id,
              title: sf.title,
              geojson: sf.geojson,  // Extract from spatial_footprint
              map_coords: sf.map_coords || {},
              type: item.type,  //Assign inherited type
            }))
          )
        ].filter(item => item.geojson);
      
        console.log("spatialData:", spatialData); //Debugging
      
        previewMap(JSON.stringify(spatialData));  //Now data has type included
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

export default SpatialFootprintMapViewer;