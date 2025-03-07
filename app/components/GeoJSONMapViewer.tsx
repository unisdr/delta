import React, { useEffect, useState } from "react";

type GeoJSONMapViewerProps = {
  id: string;
  dataSource: {
    total: number;
    name: string;
    geojson: any;
    colorPercentage?: number;
  }[];
  legendMaxColor: string;
};

const glbMapperJS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const glbMapperCSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const glbColors = {
  polygon: "#208f04",
  line: "#FF851B",
  rectangle: "#2ECC40",
  circle: "#FF4136",
  marker: "#85144b",
};

const glbMarkerIcon = {
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [20, 20],
  iconAnchor: [5, 20],
  popupAnchor: [0, -20],
  shadowUrl: null,
  className: "custom-leaflet-marker",
};

const loadLeaflet = (setLeafletLoaded: (loaded: boolean) => void) => {
  if (typeof window === "undefined") return;
  if (!(window as any).L) {
    const leafletCSS = document.createElement("link");
    leafletCSS.rel = "stylesheet";
    leafletCSS.href = glbMapperCSS;
    document.head.appendChild(leafletCSS);

    const leafletJS = document.createElement("script");
    leafletJS.src = glbMapperJS;
    leafletJS.async = true;
    leafletJS.onload = () => {
      console.log("Leaflet loaded successfully.");
      setLeafletLoaded(true);
    };
    document.head.appendChild(leafletJS);
  } else {
    setLeafletLoaded(true);
  }
};

const adjustZoomBasedOnDistance = (map: any, geoJsonLayers: any[]) => {
  const L = (window as any).L;
  const boundsArray: any[] = [];

  geoJsonLayers.forEach(layer => {
    if (layer && layer.getBounds && layer.getBounds().isValid()) {
      boundsArray.push(layer.getBounds());
    }
  });

  if (boundsArray.length > 0) {
    const bounds = L.latLngBounds(boundsArray.flat());
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  } else {
    console.warn("No valid bounds to fit the map.");
    map.setView([11.3233, 124.9200], 6);
  }
};

const getOpacityForRange = (value: number, min: number, max: number) => {
    if (value === 0) return 0; // Completely transparent if total is 0
    if (max === min) return 1.0; // Avoid division by zero

    // Normalize value between 0 and 1
    const normalizedValue = (value - min) / (max - min);
    
    // Convert to opacity scale from 0.1 to 1.0
    return 0.1 + normalizedValue * 0.9;
};

const GeoJSONMapViewer: React.FC<GeoJSONMapViewerProps> = ({ id = "", dataSource = [], legendMaxColor = "#333333" }) => {
  const [isClient, setIsClient] = useState(false);
  const [isLeafletLoaded, setLeafletLoaded] = useState(false);
  const [updatedData, setUpdatedData] = useState(dataSource);
  const [isMapRendered, setIsMapRendered] = useState(false);
  const [minTotal, setMinTotal] = useState(0);
  const [maxTotal, setMaxTotal] = useState(0);

  useEffect(() => {
    setIsClient(true);
    loadLeaflet(setLeafletLoaded);
  }, []);

  useEffect(() => {
    if (!isClient || !isLeafletLoaded || typeof window === "undefined") return;
    if (!dataSource || dataSource.length === 0) return;

    console.log("Initializing map with data:", dataSource);

    const L = (window as any).L;
    if (!L) {
      console.error("Leaflet is still not available.");
      return;
    }

    const minVal = Math.min(...dataSource.map(region => region.total));
    const maxVal = Math.max(...dataSource.map(region => region.total));

    setMinTotal(minVal);
    setMaxTotal(maxVal);

    const newData = dataSource.map(region => ({
      ...region,
      colorPercentage: getOpacityForRange(region.total, minVal, maxVal),
    }));

    setUpdatedData(newData);

    setTimeout(() => {
      const container = document.getElementById(id);
      if (!container) {
        console.error("Map container not found!");
        return;
      }

      container.innerHTML = "";

      const map = L.map(id, { preferCanvas: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">Carto</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      const geoJsonLayers: any[] = [];

      newData.forEach((region: any) => {
        try {
          if (!region.geojson) {
            console.warn(`Skipping invalid GeoJSON:`, region);
            return;
          }

          console.log('Region:', region.name, 'Region.total:', region.total, 'Region.colorPercentage:', region.colorPercentage);

          const geojsonLayer = L.geoJSON(region.geojson, {
            style: (feature: any) => ({
              color: legendMaxColor,
              fillColor: legendMaxColor,
              weight: 1.2,
              opacity: 1,
              fillOpacity: region.colorPercentage,
            }),
          }).bindPopup(`
            <div style="
              max-width: 300px; 
              padding: 10px; 
              font-size: 1.2em; 
              text-align: center;">
              <strong style="font-size: 1.5em; display: block;">${region.name}</strong>
            </div>
          `);          

          geojsonLayer.addTo(map);
          geoJsonLayers.push(geojsonLayer);
        } catch (error) {
          console.error("Error parsing GeoJSON:", error);
        }
      });

      setTimeout(() => {
        adjustZoomBasedOnDistance(map, geoJsonLayers);
        setIsMapRendered(true);
      }, 500);
    }, 500);
  }, [isClient, isLeafletLoaded, dataSource]);

  return (
    <div style={{ position: "relative" }}>
      <div id={id} style={{ height: "500px", width: "100%", zIndex: "0", backgroundColor: "#b2d2dd" }}></div>

      {isMapRendered && (
        <div style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.3)",
          fontSize: "14px",
          lineHeight: "1.5",
        }}>
          <strong>Legend</strong>
          <ul style={{ listStyle: "none", padding: 0, margin: "5px 0 0 0" }}>
            <li style={{ marginBottom: "5px" }}> 
              <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "#ffffff", marginRight: "8px", border: "1px solid #333" }}></span> No Data
            </li>
            {[...Array(6)].map((_, i) => {
              const rangeMin = minTotal + (i * (maxTotal - minTotal) / 6);
              const rangeMax = minTotal + ((i + 1) * (maxTotal - minTotal) / 6);
              return (
                <li key={i} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                  <span style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    backgroundColor: legendMaxColor,
                    opacity: (i + 1) / 6,
                    marginRight: "8px",
                    border: "1px solid #333",
                  }}></span>
                  {`<= ${Math.ceil(rangeMax)}`}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GeoJSONMapViewer;
