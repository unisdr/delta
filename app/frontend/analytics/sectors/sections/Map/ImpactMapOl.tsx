import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { OSM } from "ol/source";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import Overlay from "ol/Overlay";
import { pointerMove } from "ol/events/condition";
import Select from "ol/interaction/Select";
import Swal from "sweetalert2";
import "./ImpactMap.css"; // Custom styles

type ImpactMapProps = {
  geoData: any;
  selectedMetric: "totalDamage" | "totalLoss";
  filters: any;
};

export default function ImpactMap({ geoData, selectedMetric, filters }: ImpactMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [legendRanges, setLegendRanges] = useState<Array<{ color: string, range: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // 🗺️ Fetch data for the current level and parent
  const fetchGeoData = async (level: number, parentId: number | null) => {
    setLoading(true);
    try {
      const url = new URL('http://localhost:3000/api/analytics/geographic-impacts');
      url.searchParams.set('sectorId', filters.sectorId || '');
      url.searchParams.set('level', level.toString());
      if (parentId) {
        url.searchParams.set('parentId', parentId.toString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch geographic impact data");
      const data = await response.json();
      geoData = data;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🖱️ Handle feature click
  const handleFeatureClick = async (feature: any) => {
    const level = feature.get('level');
    const id = feature.get('id');

    // Only zoom in if we're not at the lowest level (municipality)
    if (level < 3) { // Assuming 3 is municipality level
      setCurrentLevel(level + 1);
      setCurrentParentId(id);
      await fetchGeoData(level + 1, id);

      // Zoom to feature extent
      const extent = feature.getGeometry().getExtent();
      map?.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      });
    }
  };

  // 🎨 Style function for features
  const getFeatureStyle = (feature: any, isHovered: boolean = false) => {
    const value = feature.get(selectedMetric) || 0;
    let color = "#f7fbff"; // Lightest blue for lowest values

    if (value > 60000) color = "#08519c";
    else if (value > 40000) color = "#3182bd";
    else if (value > 20000) color = "#6baed6";
    else if (value > 0) color = "#bdd7e7";

    return new Style({
      stroke: new Stroke({ color: isHovered ? "#000" : "#fff", width: isHovered ? 2 : 0.5 }),
      fill: new Fill({ color: isHovered ? "rgba(0, 0, 0, 0.1)" : color }),
    });
  };

  // Helper function to check if a feature matches the search term
  const featureMatchesSearch = (feature: any, searchTerm: string | null | undefined) => {
    if (!searchTerm || typeof searchTerm !== 'string') return true;

    const featureName = feature.properties.name?.en?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();

    // Check exact match first
    if (featureName === searchLower) return true;

    // Check if search term is in feature name
    if (featureName.includes(searchLower)) return true;

    // Check if feature name parts match search term parts
    const searchParts: string[] = searchLower.split(/\s+/);
    const featureParts: string[] = featureName.split(/\s+/);

    return searchParts.every((searchPart: string) =>
      featureParts.some((featurePart: string) =>
        featurePart.includes(searchPart) || searchPart.includes(featurePart)
      )
    );
  };

  // Update features and apply filtering
  const updateMapFeatures = (map: Map, features: any[], searchTerm?: string | null) => {
    const vectorLayer = map.getLayers().getArray().find(layer => layer instanceof VectorLayer) as VectorLayer<VectorSource>;
    if (!vectorLayer) return;

    // Update the vector layer style
    vectorLayer.setStyle((feature) => getFeatureStyle(feature));

    const source = vectorLayer.getSource();
    source?.clear();

    // Filter features based on search term
    const filteredFeatures = searchTerm && typeof searchTerm === 'string'
      ? features.filter(feature => featureMatchesSearch(feature, searchTerm))
      : features;

    if (filteredFeatures.length === 0) {
      console.log('No features match the search term:', searchTerm);
      return;
    }

    const geoJsonFeatures = new GeoJSON().readFeatures({
      type: "FeatureCollection",
      features: filteredFeatures
    }, {
      featureProjection: 'EPSG:3857',
    });
    source?.addFeatures(geoJsonFeatures);

    // Zoom to filtered features
    const extent = source?.getExtent();
    if (extent) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000,
        maxZoom: 12  // Prevent zooming in too far
      });
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([121.774017, 12.879721]),
        zoom: 5,
      }),
    });

    // Add vector layer for GeoJSON data
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geoData, {
        featureProjection: 'EPSG:3857',
      }),
    });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => getFeatureStyle(feature),
    });
    newMap.addLayer(vectorLayer);

    // Add click interaction
    newMap.on('click', (e) => {
      const feature = newMap.forEachFeatureAtPixel(e.pixel, (feature) => feature);
      if (feature) {
        handleFeatureClick(feature);
      }
    });

    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
    };
  }, []);

  // Setup tooltip and hover interactions
  useEffect(() => {
    if (!map) return;

    // Remove existing hover interactions and overlays
    map.getInteractions().getArray()
      .filter(interaction => interaction instanceof Select)
      .forEach(interaction => map.removeInteraction(interaction));

    map.getOverlays().clear();

    // Tooltip Overlay
    const tooltip = new Overlay({
      element: tooltipRef.current!,
      offset: [10, 0],
      positioning: "bottom-left",
    });
    map.addOverlay(tooltip);

    // Hover Interaction
    const selectHover = new Select({
      condition: pointerMove,
      style: (feature) => getFeatureStyle(feature, true),
    });

    map.addInteraction(selectHover);

    const updateTooltip = (feature: any) => {
      if (feature) {
        const nameObj = feature.get("name");
        const displayName = nameObj?.en || "Unknown Region";
        const value = feature.get(selectedMetric) || 0;
        const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
        const metricLabel = selectedMetric === 'totalDamage' ? 'Total Damages' : 'Total Losses';

        tooltipRef.current!.innerHTML = `
          <div class="tooltip-content">
            <div class="region-name">${displayName}</div>
            <div class="metric-value">${metricLabel}: ${formattedValue}</div>
          </div>`;
        tooltipRef.current!.style.display = "block";
      } else {
        tooltipRef.current!.style.display = "none";
      }
    };

    selectHover.on("select", (e) => {
      const feature = e.selected[0];
      updateTooltip(feature);
      if (feature) {
        tooltip.setPosition(e.mapBrowserEvent.coordinate);
      }
    });

    return () => {
      map.removeOverlay(tooltip);
      map.removeInteraction(selectHover);
      if (tooltipRef.current) {
        tooltipRef.current.style.display = "none";
      }
    };
  }, [map, selectedMetric, getFeatureStyle]);

  // Update features when geoData or selectedMetric changes
  useEffect(() => {
    if (!map || !geoData?.features) return;

    const vectorLayer = map.getLayers().getArray().find(layer => layer instanceof VectorLayer) as VectorLayer<VectorSource>;
    if (!vectorLayer) return;

    const source = vectorLayer.getSource();
    if (!source) return;

    // Clear existing features
    source.clear();

    // Add new features
    const features = new GeoJSON().readFeatures(geoData, {
      featureProjection: 'EPSG:3857'
    });
    source.addFeatures(features);

    // Calculate the extent of all features
    const extent = source.getExtent();

    // Fit the view to show all features with padding
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000,
      maxZoom: 8  // Limit max zoom to prevent zooming in too far
    });

  }, [map, geoData, selectedMetric]);

  // Reset view when filters change
  useEffect(() => {
    if (!map || !filters) return;
    setCurrentLevel(1);
    setCurrentParentId(null);
  }, [filters]);

  // Calculate legend ranges based on data
  useEffect(() => {
    if (!geoData?.features) return;

    // Extract all values for the selected metric
    const values = geoData.features
      .map((f: { properties: { [key: string]: number } }) => f.properties[selectedMetric])
      .filter((v: number | null | undefined) => v !== null && v !== undefined)
      .sort((a: number, b: number) => a - b);

    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const ranges = [
      { color: "#bdd7e7", range: "0 - 20,000" },
      { color: "#6baed6", range: "20,000 - 40,000" },
      { color: "#3182bd", range: "40,000 - 60,000" },
      { color: "#08519c", range: "> 60,000" }
    ];

    setLegendRanges(ranges);
  }, [geoData, selectedMetric]);

  return (
    <div className="impact-map-container">
      <div className="map-header">
        <div className="map-controls">
          {currentLevel > 1 && (
            <button
              className="back-button"
              onClick={async () => {
                const newLevel = currentLevel - 1;
                const parentFeature = geoData?.features?.find((f: { properties: { id: number | null; }; }) => f.properties.id === currentParentId);
                const grandParentId = parentFeature?.properties?.parentId;

                setCurrentLevel(newLevel);
                setCurrentParentId(grandParentId);
                await fetchGeoData(newLevel, grandParentId);
              }}
              disabled={loading}
            >
              ← Back to {currentLevel === 2 ? 'Regions' : 'Provinces'}
            </button>
          )}
          {loading && <div className="loading-indicator">Loading...</div>}
        </div>
        <div className="legend">
          <h4>Legend</h4>
          <div className="legend-items">
            {legendRanges.map((item, index) => (
              <div key={index} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                <span className="legend-label">{item.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />
      <div ref={tooltipRef} className="map-tooltip" />
    </div>
  );
}
