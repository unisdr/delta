import { useEffect, useState, useImperativeHandle, forwardRef, useRef, useCallback } from "react";

export type MapChartRef = {
  getDataSource: () => DataSourceType; // Get current dataSource
  setDataSource: (newData: DataSourceType) => void; // Dynamically update dataSource
  setLegendTitle: (newTitle: string) => void; // Dynamically update legend title
  setLegendMaxColor: (newColor: string) => void; // Dynamically update legend max color
};

type MapChartProps = {
  id?: string;
  dataSource: {
    total: number;
    name: string;
    geojson: any;
    colorPercentage?: number;
    description?: string;
  }[];
  legendMaxColor?: string;
  legendTitle?: string;
  mapMode?: "default" | "light" | "dark";
};

type DataSourceType = {
  total: number;
  name: string;
  geojson: any;
  colorPercentage?: number;
  description?: string;
}[];

const glbMapperJS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const glbMapperCSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";


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

const getTileLayer = (mapMode: string) => {
  switch (mapMode) {
    case "light":
      return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    case "dark":
      return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    default:
      return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
};

const MapChart = forwardRef<MapChartRef, MapChartProps>(
  ({ id = null, dataSource = [], legendMaxColor = "#333333", legendTitle = "Legend", mapMode = "light" }, ref) => {

  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [updatedDataSource, setUpdatedDataSource] = useState(dataSource);
  const [currentLegendTitle, setCurrentLegendTitle] = useState(legendTitle);
  const [currentLegendMaxColor, setCurrentLegendMaxColor] = useState(legendMaxColor);

  useEffect(() => {
    if (!id) {
      setGeneratedId(`id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [id]);  

  const componentId = (id || generatedId) as string;

  useImperativeHandle(ref, () => ({
    getDataSource: () => updatedDataSource,
    setDataSource: (newData: DataSourceType) => {
      setUpdatedDataSource(newData);
    },
    setLegendTitle: (newTitle: string) => {
      setCurrentLegendTitle(newTitle);
    },
    setLegendMaxColor: (newColor: string) => {
      setCurrentLegendMaxColor(newColor);
    }
  }));  
  
  const [isClient, setIsClient] = useState(false);
  const [isLeafletLoaded, setLeafletLoaded] = useState(false);
  const [isMapRendered, setIsMapRendered] = useState(false);
  const [minTotal, setMinTotal] = useState(0);
  const [maxTotal, setMaxTotal] = useState(0);

  const mapRef = useRef<any>(null);

  const makeLegendDraggable = () => {
    const legend = document.getElementById(`${componentId}_map-legend`);
    if (!legend) return;
  
    let offsetX = 0, offsetY = 0, isDragging = false;
  
    legend.style.position = "absolute"; // Ensure absolute positioning
    legend.style.width = `${legend.offsetWidth}px`; // Fix width to prevent squeezing
    legend.style.top = legend.offsetTop + "px";
    legend.style.left = legend.offsetLeft + "px";
    legend.style.right = "auto"; // Override inset properties
    legend.style.bottom = "auto";
  
    legend.onmousedown = (e) => {
      isDragging = true;
      offsetX = e.clientX - legend.offsetLeft;
      offsetY = e.clientY - legend.offsetTop;
  
      document.onmousemove = (e) => {
        if (!isDragging) return;
  
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
  
        // **Prevent dragging out of viewport**
        const maxLeft = window.innerWidth - legend.offsetWidth;
        const maxTop = window.innerHeight - legend.offsetHeight;
  
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
  
        legend.style.left = `${newLeft}px`;
        legend.style.top = `${newTop}px`;
      };
  
      document.onmouseup = () => {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
  };

  useEffect(() => {
    setIsClient(true);
    loadLeaflet(setLeafletLoaded);
  }, []);

  const updateMapLayers = useCallback((dataSource: DataSourceType) => {
    if (!isClient || !isLeafletLoaded || typeof window === "undefined") return;
    if (!dataSource || dataSource.length === 0) return;
  
    console.log("Updating map with new data:", dataSource);
  
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
  
    setTimeout(() => {
      if (!mapRef.current) {
        console.log("Creating new Leaflet map...");
        mapRef.current = L.map(componentId, { preferCanvas: true });
        L.tileLayer(getTileLayer(mapMode), {
          attribution: '',
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(mapRef.current);
      } else {
        console.log("Clearing previous layers...");
        mapRef.current.eachLayer((layer: any) => {
          if (layer instanceof L.GeoJSON) {
            mapRef.current.removeLayer(layer);
          }
        });
      }
  
      const geoJsonLayers: any[] = [];
  
      newData.forEach((region: any) => {
        try {
          if (!region.geojson) {
            console.warn(`⚠️ Skipping invalid GeoJSON:`, region);
            return;
          }
  
          const geojsonLayer = L.geoJSON(region.geojson, {
            style: () => ({
              color: currentLegendMaxColor,
              fillColor: currentLegendMaxColor,
              weight: 1.2,
              opacity: 1,
              fillOpacity: region.colorPercentage,
            }),
          });

          if (geojsonLayer.getPopup()) {
            geojsonLayer.unbindPopup();
          }

          geojsonLayer.bindPopup(
            `
              <div style="
                max-width: 300px; 
                padding: 10px; 
                font-size: 1.2em; 
                text-align: left;">
                <strong style="font-size: 1.2em; display: block;">${region.name}</strong>
                ${region.total > 0 ? `<p>${region?.description || ""}</p>` : ""}
              </div>
            `
          );
  
          geojsonLayer.addTo(mapRef.current);
          geoJsonLayers.push(geojsonLayer);
        } catch (error) {
          console.error("Error parsing GeoJSON:", error);
        }
      });
  
      setTimeout(() => {
        adjustZoomBasedOnDistance(mapRef.current, geoJsonLayers);
        setIsMapRendered(true);
        setTimeout(() => { makeLegendDraggable(); }, 1000);
  
        // Remove attribution links
        const attributionElement = document.querySelector(".leaflet-control-attribution.leaflet-control a");
        if (attributionElement) {
          attributionElement.remove();
        }
      }, 500);
    }, 500);
  }, [isClient, isLeafletLoaded, dataSource]);  
  
  // Ensure map updates when dataSource changes
  useEffect(() => {
    updateMapLayers(dataSource);
  }, [isClient, isLeafletLoaded, dataSource, updateMapLayers]);
  
  return (
    <div style={{ position: "relative" }}>
      <div id={componentId} style={{ height: "500px", width: "100%", zIndex: "0", backgroundColor: "#b2d2dd" }}></div>

      {isMapRendered && (
        <div
          id={`${componentId}_map-legend`}
          style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.3)",
          fontSize: "14px",
          lineHeight: "1.5",
          whiteSpace: "nowrap", // Prevent text wrapping that causes shrink
        }}>
          <strong>{currentLegendTitle}</strong>
          <ul style={{ listStyle: "none", padding: 0, margin: "5px 0 0 0" }}>
            <li style={{ marginBottom: "5px", display: "flex", alignItems: "center" }}> 
              <span style={{
                display: "inline-flex",
                width: "14px",
                height: "14px",
                justifyContent: "center",
                alignItems: "center",
                border: `1px solid ${currentLegendMaxColor}`, // Keeps the border
                marginRight: "8px",
              }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#ffffff", // White fill for "No Data"
                }}></div>
              </span>
              No Data
            </li>
            {[...Array(6)].map((_, i) => {
              // const rangeMin = minTotal + (i * (maxTotal - minTotal) / 6);
              const rangeMax = minTotal + ((i + 1) * (maxTotal - minTotal) / 6);
              return (
                <li key={i} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                  <span style={{
                    display: "inline-flex",
                    width: "14px",  // Slightly larger for better spacing
                    height: "14px",
                    justifyContent: "center",
                    alignItems: "center",
                    border: `1px solid ${currentLegendMaxColor}`, // Border remains visible
                    marginRight: "8px",
                  }}>
                    <div style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: currentLegendMaxColor,
                      opacity: (i + 1) / 6, // Opacity applied only to inner div
                    }}></div>
                  </span>
                  {`<= ${Math.ceil(rangeMax)}`}
                </li>

              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
});

export default MapChart;
