import React, { useEffect, useState } from "react";

type SpatialFootprintMapViewerProps = {
  id: string;
  dataSource: {
    total: number;
    name: string;
    geojson: any;
    colorPercentage?: number; // Will be calculated dynamically
  }[];
};

const glbMapperJS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const glbMapperCSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const glbColors = {
  polygon: "#333333",
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

// ✅ Adjust zoom to fit all shapes
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

// ✅ Get color dynamically for each geometry type
const getColorForGeometry = (geometryType: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | 'Rectangle' | 'Circle') => {
  const colors = {
    Point: glbColors.marker,
    LineString: glbColors.line,
    Polygon: glbColors.polygon,
    MultiPolygon: glbColors.polygon,
    Rectangle: glbColors.rectangle,
    Circle: glbColors.circle,
  };
  return colors[geometryType] || "#000000";
};

const GeoJSONMapViewer: React.FC<SpatialFootprintMapViewerProps> = ({ id = "", dataSource = [] }) => {
  const [isClient, setIsClient] = useState(false);
  const [isLeafletLoaded, setLeafletLoaded] = useState(false);

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
  
    // ✅ Compute distinct opacity values based on index
    const length = dataSource.length;
    dataSource.forEach((region, index) => {
      if (length === 1) {
        region.colorPercentage = 1.0; // Only one region, full opacity
      } else {
        region.colorPercentage = index === 0 ? 0.1 : index === length - 1 ? 1.0 : (index / (length - 1));
      }
      console.log(`region.colorPercentage ${region.name} - ${region.colorPercentage}`);
    });
  
    // ✅ Wait until the container is mounted
    setTimeout(() => {
      const container = document.getElementById(id);
      if (!container) {
        console.error("Map container not found!");
        return;
      }
  
      container.innerHTML = ""; // Clear the container before rendering
  
      const map = L.map(id, { preferCanvas: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  
      const geoJsonLayers: any[] = [];
  
      dataSource.forEach((region: any) => {
        try {
          if (!region.geojson) {
            console.warn(`Skipping invalid GeoJSON:`, region);
            return;
          }
  
          const geojsonLayer = L.geoJSON(region.geojson, {
            style: (feature: any) => {
              const geometryType = feature.geometry.type;
              const color = getColorForGeometry(geometryType);
              return {
                color: color,
                fillColor: color,
                weight: 2,
                opacity: 1,
                fillOpacity: region.colorPercentage, // Apply improved calculated opacity
              };
            },
          });
  
          geojsonLayer.addTo(map);
          geoJsonLayers.push(geojsonLayer);
        } catch (error) {
          console.error("Error parsing GeoJSON:", error);
        }
      });
  
      setTimeout(() => adjustZoomBasedOnDistance(map, geoJsonLayers), 500);
    }, 500);
  }, [isClient, isLeafletLoaded, dataSource]);
  
  return <div id={id} style={{ position: "relative", height: "500px", width: "100%", zIndex: "0", backgroundColor: "#b2d2dd" }}></div>;
};

export default GeoJSONMapViewer;
