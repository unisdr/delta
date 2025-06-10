import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Fill, Stroke, Style } from "ol/style";
import type { StyleFunction } from "ol/style/Style";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import { unByKey } from "ol/Observable";
import { FeatureLike } from "ol/Feature"; // Import FeatureLike to handle both Feature and RenderFeature
import { Feature } from "ol";
import { getCenter } from "ol/extent";
import { Geometry } from "ol/geom";
import Swal from "sweetalert2";
import { formatCurrencyWithCode, useDefaultCurrency } from "~/frontend/utils/formatters";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";
import Legend from "~/frontend/analytics/sectors/sections/Map/Legend";
import "~/frontend/analytics/sectors/sections/Map/ImpactMap.css"; // Assuming this CSS file is available and compatible

// Types for GeoJSON data and props
export interface GeoFeatureProperties {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  values: {
    totalDamage: number;
    totalLoss: number;
    metadata?: {
      assessmentType: "rapid" | "detailed";
      confidenceLevel: "low" | "medium" | "high";
    };
    dataAvailability: "available" | "no_data";
  };
}

export interface GeoFeature {
  type: "Feature";
  properties: GeoFeatureProperties;
  geometry: any;
}

export interface GeoData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

export interface Filters {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
  assessmentType?: "rapid" | "detailed";
  confidenceLevel?: "low" | "medium" | "high";
}

interface ColorRange {
  min: number;
  max: number;
  color: string;
  label: string;
}

export interface CustomMapProps {
  geoData: GeoData;
  selectedMetric: "totalDamage" | "totalLoss";
  filters: Filters;
  apiEndpoint?: string;
  levelCap?: number;
  calculateColorRanges?: (values: number[], defaultCurrency: string) => ColorRange[];
  currency: string;
}

// Helper function to check if a color is light
const isLightColor = (color: string): boolean => {
  try {
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      const [_, r, g, b] = rgbaMatch;
      const brightness = (parseInt(r) * 299 + parseInt(g) * 587 + parseInt(b) * 114) / 1000;
      return brightness > 128;
    }

    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  } catch {
    return false;
  }
};

const ReusableImpactMap: React.FC<CustomMapProps> = ({
  geoData,
  selectedMetric,
  filters,
  apiEndpoint = "/api/analytics/geographic-impacts",
  levelCap = 3,
  calculateColorRanges: customCalculateColorRanges,
  currency
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [legendRanges, setLegendRanges] = useState<Array<{ color: string; range: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredFeatureColor, setHoveredFeatureColor] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureLike | null>(null);
  const defaultCurrency = useDefaultCurrency();

  // Default color range calculation if not provided via props
  const defaultCalculateColorRanges = (values: number[], currency: string): ColorRange[] => {
    const max = Math.max(...values, 0);
    let ranges: ColorRange[] = [];

    if (max > 0) {
      ranges = [
        {
          min: max * 0.8,
          max: max,
          color: "rgba(21, 101, 192, 0.9)",
          label: `${formatCurrencyWithCode(
            max * 0.8,
            currency,
            {},
            max * 0.8 >= 1_000_000_000 ? "billions" : max * 0.8 >= 1_000_000 ? "millions" : "thousands"
          )} - ${formatCurrencyWithCode(
            max,
            currency,
            {},
            max >= 1_000_000_000 ? "billions" : max >= 1_000_000 ? "millions" : "thousands"
          )}`,
        },
        {
          min: max * 0.6,
          max: max * 0.8,
          color: "rgba(30, 136, 229, 0.9)",
          label: `${formatCurrencyWithCode(
            max * 0.6,
            currency,
            {},
            max * 0.6 >= 1_000_000_000 ? "billions" : max * 0.6 >= 1_000_000 ? "millions" : "thousands"
          )} - ${formatCurrencyWithCode(
            max * 0.8,
            currency,
            {},
            max * 0.8 >= 1_000_000_000 ? "billions" : max * 0.8 >= 1_000_000 ? "millions" : "thousands"
          )}`,
        },
        {
          min: max * 0.4,
          max: max * 0.6,
          color: "rgba(66, 165, 245, 0.9)",
          label: `${formatCurrencyWithCode(
            max * 0.4,
            currency,
            {},
            max * 0.4 >= 1_000_000_000 ? "billions" : max * 0.4 >= 1_000_000 ? "millions" : "thousands"
          )} - ${formatCurrencyWithCode(
            max * 0.6,
            currency,
            {},
            max * 0.6 >= 1_000_000_000 ? "billions" : max * 0.6 >= 1_000_000 ? "millions" : "thousands"
          )}`,
        },
        {
          min: max * 0.2,
          max: max * 0.4,
          color: "rgba(144, 202, 249, 0.9)",
          label: `${formatCurrencyWithCode(
            max * 0.2,
            currency,
            {},
            max * 0.2 >= 1_000_000_000 ? "billions" : max * 0.2 >= 1_000_000 ? "millions" : "thousands"
          )} - ${formatCurrencyWithCode(
            max * 0.4,
            currency,
            {},
            max * 0.4 >= 1_000_000_000 ? "billions" : max * 0.4 >= 1_000_000 ? "millions" : "thousands"
          )}`,
        },
        {
          min: 0.1,
          max: max * 0.2,
          color: "rgba(227, 242, 253, 0.9)",
          label: `${formatCurrencyWithCode(
            0.1,
            currency,
            {},
            0.1 >= 1_000_000_000 ? "billions" : 0.1 >= 1_000_000 ? "millions" : "thousands"
          )} - ${formatCurrencyWithCode(
            max * 0.2,
            currency,
            {},
            max * 0.2 >= 1_000_000_000 ? "billions" : max * 0.2 >= 1_000_000 ? "millions" : "thousands"
          )}`,
        },
      ];
    }

    ranges.push(
      { min: 0, max: 0, color: "rgba(255, 255, 255, 0.9)", label: "Zero Impact (Confirmed)" },
      { min: -1, max: -1, color: "rgba(200, 200, 200, 0.9)", label: "No Data Available" }
    );

    return ranges;
  };

  // Fetch data for drill-down
  const fetchGeoData = async (level: number, parentId: number | null): Promise<GeoData | null> => {
    setLoading(true);
    try {
      const url = new URL(apiEndpoint, window.location.origin);
      const params = new URLSearchParams();

      if (filters.sectorId) {
        params.set("sectorId", filters.sectorId);
      }

      const optionalParams: Array<[keyof Filters, string]> = [
        ["subSectorId", "subSectorId"],
        ["hazardTypeId", "hazardTypeId"],
        ["hazardClusterId", "hazardClusterId"],
        ["specificHazardId", "specificHazardId"],
        ["geographicLevelId", "geographicLevelId"],
        ["fromDate", "fromDate"],
        ["toDate", "toDate"],
        ["disasterEventId", "disasterEventId"],
        ["assessmentType", "assessmentType"],
        ["confidenceLevel", "confidenceLevel"],
      ];

      optionalParams.forEach(([key, paramName]) => {
        const value = filters[key];
        if (value) {
          params.set(paramName, value);
        }
      });

      params.set("level", level.toString());
      if (parentId !== null) {
        params.set("parentId", parentId.toString());
      }

      const response = await fetch(`${url.toString()}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch geographic impact data: ${response.statusText}`);
      }

      const data: GeoData = await response.json();
      if (!data || !data.features) {
        throw new Error("Invalid response format from geographic impacts API");
      }

      return data;
    } catch (error) {
      console.error("🧭 Unable to load map data. Please check your internet connection or filters.", error);
      Swal.fire({
        title: "Could not load map",
        text: error instanceof Error
          ? error.message
          : "Please check your filters or try reloading the page. If the issue persists, contact support.",
        icon: "error",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle feature click for drill-down
  const handleFeatureClick = async (feature: Feature<Geometry>) => {
    // Drilldown functionality temporarily disabled
    return;

    /* Commented out drilldown functionality
    const level = feature.get("level");
    const id = feature.get("id");

    // Only zoom in if we're not at the level cap
    if (level >= levelCap) {
      return;
    }

    setLoading(true);
    try {
      // Get the feature extent for smooth zooming
      const extent = feature.getGeometry()?.getExtent();
      if (!extent) throw new Error("Feature geometry not found");

      const view = map?.getView();
      const center = getCenter(extent);
      const resolution = view?.getResolutionForExtent(extent);

      // Animate zoom
      view?.animate({
        center,
        resolution,
        duration: 1000,
        easing: (t: number) => Math.pow(t, 0.5),
      });

      // Update state and fetch new data
      setCurrentLevel(level + 1);
      setCurrentParentId(id);
      const newGeoData = await fetchGeoData(level + 1, id);
      if (newGeoData) {
        geoData = newGeoData; // Update geoData for the new level
      }
    } catch (error) {
      console.error("Error during drill-down:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load detailed view. Please try again or contact support if the issue persists.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
    */
  };

  // Calculate color ranges - Updated to show only present values
  const colorRanges = useMemo(() => {
    if (!geoData?.features) return [];

    // Extract all values and categorize them
    const allValues: number[] = [];
    const categorizedData = {
      hasPositiveValues: false,
      hasZeroValues: false,
      hasNoData: false
    };

    geoData.features.forEach((f) => {
      const values = f.properties?.values?.[selectedMetric];
      const dataAvailability = f.properties?.values?.dataAvailability;
      
      if (dataAvailability === "no_data") {
        categorizedData.hasNoData = true;
      } else if (values === 0) {
        categorizedData.hasZeroValues = true;
      } else if (typeof values === "number" && values > 0) {
        allValues.push(values);
        categorizedData.hasPositiveValues = true;
      }
    });

    // Calculate ranges for positive values
    const ranges = (customCalculateColorRanges || defaultCalculateColorRanges)(
      allValues,
      currency
    );

    // Filter ranges to only include those that have actual data points
    const filteredRanges: ColorRange[] = [];

    if (categorizedData.hasPositiveValues && allValues.length > 0) {
      // Only include color ranges that have actual values falling within them
      ranges.forEach((range) => {
        // Skip the special cases (zero and no data) for now
        if (range.min === 0 && range.max === 0) return;
        if (range.min === -1 && range.max === -1) return;
        
        // Check if any actual values fall within this range
        const hasValuesInRange = allValues.some(value => 
          value >= range.min && value <= range.max
        );
        
        if (hasValuesInRange) {
          filteredRanges.push(range);
        }
      });
    }

    // Add special categories only if they exist in the data
    if (categorizedData.hasZeroValues) {
      filteredRanges.push({
        min: 0,
        max: 0,
        color: "rgba(255, 255, 255, 0.9)",
        label: "Zero Impact (Confirmed)"
      });
    }

    if (categorizedData.hasNoData) {
      filteredRanges.push({
        min: -1,
        max: -1,
        color: "rgba(200, 200, 200, 0.9)",
        label: "No Data Available"
      });
    }

    // Update legend with only the ranges that are actually present
    setLegendRanges(
      filteredRanges.map((r) => ({
        color: r.color,
        range: r.label,
      }))
    );

    return filteredRanges;
  }, [geoData?.features, selectedMetric, defaultCurrency, customCalculateColorRanges]);

  // Feature style function - Updated to match OpenLayers StyleFunction type
  const getFeatureStyle = useCallback(
    (feature: FeatureLike, resolution: number) => {
      // Safely access properties using get() method, which works for both Feature and RenderFeature
      const values = feature.get("values");
      const value = values?.[selectedMetric];
      const dataAvailability = values?.dataAvailability;

      let color = "rgba(200, 200, 200, 0.9)"; // Default: grey for no data
      if (dataAvailability === "no_data") {
        color = "rgba(200, 200, 200, 0.9)";
      } else if (value === 0) {
        color = "rgba(255, 255, 255, 0.9)"; // White for zero impact
      } else if (value > 0) {
        const range = colorRanges.find((r) => value >= r.min && value <= r.max);
        color = range ? range.color : "rgba(200, 200, 200, 0.9)";
      }

      // Check if feature is being hovered by comparing with currently hovered feature
      const isHovered = feature === hoveredFeature;

      return new Style({
        fill: new Fill({ color }),
        stroke: new Stroke({
          color: isHovered ? "#000" : "#666",
          width: isHovered ? 3 : 1.5,
          lineDash: isHovered ? undefined : [1, 2],
        }),
      });
    },
    [selectedMetric, colorRanges, hoveredFeature]
  ) as StyleFunction;

  // Update tooltip - Updated to handle FeatureLike
  const updateTooltip = useCallback(
    (feature: FeatureLike, coordinates: number[]) => {
      if (!tooltipRef.current || !map) return;

      const tooltip = tooltipRef.current;
      const pixel = map.getPixelFromCoordinate(coordinates);

      if (!pixel) {
        tooltip.style.display = "none";
        return;
      }

      const name = feature.get("name")?.en || feature.get("name") || "Unknown";
      const values = feature.get("values");
      const value = values?.[selectedMetric];
      const dataAvailability = values?.dataAvailability;
      const metricLabel = selectedMetric === "totalDamage" ? "Total Damages" : "Total Losses";

      const style = getFeatureStyle(feature, 0);
      const fill = style instanceof Style ? style.getFill() : null;
      const backgroundColor = fill ? fill.getColor() as string : "#FFFFFF";
      setHoveredFeatureColor(backgroundColor);

      const textColor = isLightColor(backgroundColor) ? "#333333" : "#FFFFFF";
      const subTextColor = isLightColor(backgroundColor) ? "#666666" : "#EEEEEE";

      let displayValue: string;
      if (dataAvailability === "no_data") {
        displayValue = "No Data Available";
      } else if (value === 0) {
        displayValue = "Zero Impact (Confirmed)";
      } else if (value > 0) {
        displayValue = formatCurrencyWithCode(
          value,
          defaultCurrency,
          {},
          value >= 1_000_000_000 ? "billions" : value >= 1_000_000 ? "millions" : "thousands"
        );
      } else {
        displayValue = "No Data Available";
      }

      tooltip.innerHTML = `
        <div class="tooltip-container">
          <div class="tooltip-title" style="color: ${textColor};">${name}</div>
          <div class="tooltip-metric" style="color: ${subTextColor};">
            <span class="tooltip-metric-label">${metricLabel}:</span>
            <span class="tooltip-metric-value" style="color: ${textColor};">${displayValue}</span>
          </div>
        </div>
      `;

      tooltip.style.backgroundColor = backgroundColor;
      tooltip.style.left = `${pixel[0]}px`;
      tooltip.style.top = `${pixel[1]}px`;
      tooltip.style.display = "block";
      tooltip.style.transform = "translate(-50%, -120%)";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "1000";
    },
    [map, selectedMetric, defaultCurrency, getFeatureStyle]
  );

  // Initialize map - Updated style typing
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: getFeatureStyle, // Directly pass the function, type is now compatible
    });

    const nationalFeature = geoData.features.find(
      (feature) => feature.properties.parentId === null
    );

    let initialCenter = [0, 0];
    let initialZoom = 5;

    if (nationalFeature) {
      const format = new GeoJSON();
      const olFeature = format.readFeature(nationalFeature, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      }) as Feature<Geometry>;

      const geometry = olFeature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        initialCenter = getCenter(extent);
        const width = Math.abs(extent[2] - extent[0]);
        const height = Math.abs(extent[3] - extent[1]);
        const size = Math.max(width, height);
        initialZoom = Math.floor(Math.log2(40000000 / size)) - 1;
      }
    }

    const newMap = new Map({
      target: mapRef.current,
      layers: [vectorLayer],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
      }),
      controls: defaultControls(),
      interactions: defaultInteractions(),
    });

    setMap(newMap);

    const format = new GeoJSON();
    const features = format.readFeatures(geoData, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    vectorSource.addFeatures(features);

    const extent = vectorSource.getExtent();
    if (extent && !extent.some(isNaN) && extent[0] !== Infinity) {
      newMap.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 8,
        duration: 1000,
      });
    }

    // Handle click events for drill-down
    newMap.on("click", (event) => {
      newMap.forEachFeatureAtPixel(event.pixel, (feature) => {
        // Ensure the feature is a Feature<Geometry> for drill-down
        if (feature instanceof Feature) {
          handleFeatureClick(feature as Feature<Geometry>);
        }
      });
    });

    return () => {
      newMap.setTarget(undefined);
    };
  }, [mapRef, geoData, getFeatureStyle]); // Add getFeatureStyle to dependencies

  useEffect(() => {
    if (!map || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;

    const pointerMoveHandler = (event: any) => {
      const pixel = map.getEventPixel(event.originalEvent);
      const hit = map.hasFeatureAtPixel(pixel);

      map.getTargetElement().style.cursor = hit ? "pointer" : "";

      if (!hit) {
        tooltip.style.display = "none";
        return;
      }

      let hoveredFeature: FeatureLike | null = null;
      map.forEachFeatureAtPixel(pixel, (feature) => {
        hoveredFeature = feature as FeatureLike;
      });

      if (hoveredFeature) {
        updateTooltip(hoveredFeature, event.coordinate);
      } else {
        tooltip.style.display = "none";
      }
    };

    const moveStartHandler = () => {
      tooltip.style.display = "none";
    };

    // Add event listeners
    const moveListener = map.on("pointermove", pointerMoveHandler);
    const startListener = map.on("movestart", moveStartHandler);

    // --- ADDED: Mobile/tablet tap support for tooltip ---
    const singleClickHandler = (event: any) => {
      const pixel = map.getEventPixel(event.originalEvent || event);
      let tappedFeature: FeatureLike | null = null;
      map.forEachFeatureAtPixel(pixel, (feature) => {
        tappedFeature = feature as FeatureLike;
      });
      if (tappedFeature) {
        updateTooltip(tappedFeature, event.coordinate);
        // Optionally auto-hide after 3 seconds
        setTimeout(() => {
          if (tooltip) tooltip.style.display = "none";
        }, 3000);
      } else if (tooltip) {
        tooltip.style.display = "none";
      }
    };
    const clickListener = map.on("singleclick", singleClickHandler);
    // --- END ADDED ---

    // Cleanup event listeners
    return () => {
      unByKey(moveListener);
      unByKey(startListener);
      // --- ADDED: cleanup for singleclick ---
      unByKey(clickListener);
      // --- END ADDED ---
      if (tooltip) {
        tooltip.style.display = "none";
      }
    };
  }, [map, updateTooltip]);

  // Update map features when geoData or selectedMetric changes
  useEffect(() => {
    if (!map || !geoData?.features) return;

    const vectorLayer = map
      .getLayers()
      .getArray()
      .find((layer) => layer instanceof VectorLayer) as VectorLayer<VectorSource>;

    if (!vectorLayer) {
      const newVectorLayer = new VectorLayer({
        source: new VectorSource(),
        style: getFeatureStyle,
      });
      map.addLayer(newVectorLayer);
    } else {
      vectorLayer.setStyle(getFeatureStyle);
    }

    const source = vectorLayer?.getSource();
    if (!source) return;

    source.clear();

    const format = new GeoJSON();
    const features = format.readFeatures(geoData, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    source.addFeatures(features);

    // Always fit to extent when selectedMetric changes
    const extent = source.getExtent();
    if (extent && !extent.some(isNaN) && extent[0] !== Infinity) {
      map.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 8,
        duration: 1000,
      });
    }

    // Reset to initial view state
    setCurrentLevel(0);
    setCurrentParentId(null);

  }, [map, geoData, selectedMetric, getFeatureStyle]); // Added selectedMetric to dependencies

  // Reset view when filters change
  useEffect(() => {
    if (!map || !filters) return;
    setCurrentLevel(1);
    setCurrentParentId(null);
  }, [filters, map]);

  // Empty state
  if (!geoData?.features || geoData.features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg">
        <div className="text-gray-500 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No geographic data available</h3>
          <p className="mt-1 text-sm text-gray-400">
            {filters?.sectorId
              ? "No geographic impact data found for the selected filters. Try adjusting your selection."
              : "Please select a sector to view geographic impact data."}
          </p>
          {filters?.sectorId && (
            <p className="mt-2 text-xs text-gray-400">
              This could mean either no impacts were recorded, or the data is still being processed.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="impact-map-container">
        <div ref={mapRef} className="map" />
        <div ref={tooltipRef} className="map-tooltip" />
        <Legend ranges={legendRanges} selectedMetric={selectedMetric} currency={currency}/>
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <div className="loading-text">Loading map data...</div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ReusableImpactMap;