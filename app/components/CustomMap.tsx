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
import { FeatureLike } from "ol/Feature";
import { Feature } from "ol";
import { getCenter } from "ol/extent";
import { Geometry } from "ol/geom";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";
import Legend from "~/frontend/analytics/sectors/sections/Map/Legend";
import "~/frontend/analytics/sectors/sections/Map/ImpactMap.css";

// Extended types for multi-metric support
export interface GeoFeatureProperties {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  values: {
    // Monetary values
    totalDamage?: number;
    totalLoss?: number;

    // Quantitative values  
    deaths?: number;
    injured?: number;
    affectedPeople?: number;
    displaced?: number;
    homeless?: number;
    numberOfEvents?: number;

    // Custom metrics (flexible for future extensions)
    [key: string]: number | string | object | undefined;

    // Metadata
    metadata?: {
      assessmentType: "rapid" | "detailed";
      confidenceLevel: "low" | "medium" | "high";
      lastUpdated?: string;
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

export interface MetricConfig {
  type: "monetary" | "count" | "percentage";
  unit?: string;
  label: string;
  currency?: string;
  formatOptions?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    notation?: "compact" | "standard";
  };
}

export interface CustomMapProps {
  geoData: GeoData;
  selectedMetric: string; // Changed from restricted union to flexible string
  filters: Filters;
  apiEndpoint?: string;
  levelCap?: number;
  calculateColorRanges?: (values: number[], currency?: string) => ColorRange[];
  currency?: string; // Made optional since not all metrics are monetary
  valueFormatter?: (value: number, metric: string) => string;
  metricConfig?: MetricConfig;
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

// Default metric configurations
const getDefaultMetricConfig = (metric: string): MetricConfig => {
  const configs: Record<string, MetricConfig> = {
    totalDamage: {
      type: "monetary",
      label: "Total Economic Damage",
      currency: "USD"
    },
    totalLoss: {
      type: "monetary",
      label: "Total Economic Losses",
      currency: "USD"
    },
    deaths: {
      type: "count",
      unit: "people",
      label: "Fatalities"
    },
    injured: {
      type: "count",
      unit: "people",
      label: "Injuries"
    },
    affectedPeople: {
      type: "count",
      unit: "people",
      label: "Affected Population"
    },
    displaced: {
      type: "count",
      unit: "people",
      label: "Displaced People"
    },
    homeless: {
      type: "count",
      unit: "people",
      label: "Homeless People"
    },
    numberOfEvents: {
      type: "count",
      unit: "events",
      label: "Number of Events"
    }
  };

  return configs[metric] || {
    type: "count",
    label: metric.charAt(0).toUpperCase() + metric.slice(1)
  };
};

// Enhanced value formatter
const formatValue = (
  value: number,
  metric: string,
  config?: MetricConfig,
  customFormatter?: (value: number, metric: string) => string,
  currency?: string
): string => {
  if (customFormatter) {
    return customFormatter(value, metric);
  }

  const metricConfig = config || getDefaultMetricConfig(metric);

  if (value === 0) {
    switch (metricConfig.type) {
      case "monetary":
        return "No economic impact";
      case "count":
        return `No ${metricConfig.unit || "items"}`;
      case "percentage":
        return "0%";
      default:
        return "No data";
    }
  }

  switch (metricConfig.type) {
    case "monetary":
      const currencyCode = metricConfig.currency || currency || "USD";
      return formatCurrencyWithCode(
        value,
        currencyCode,
        {},
        value >= 1_000_000_000 ? "billions" : value >= 1_000_000 ? "millions" : "thousands"
      );

    case "count":
      const formatCount = (num: number) => {
        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toLocaleString();
      };

      const formattedNumber = formatCount(value);
      return metricConfig.unit ? `${formattedNumber} ${metricConfig.unit}` : formattedNumber;

    case "percentage":
      const decimals = metricConfig.formatOptions?.maximumFractionDigits || 1;
      return `${value.toFixed(decimals)}%`;

    default:
      return value.toLocaleString();
  }
};

const ExtendedCustomMap: React.FC<CustomMapProps> = ({
  geoData,
  selectedMetric,
  filters,
  calculateColorRanges: customCalculateColorRanges,
  currency,
  valueFormatter,
  metricConfig
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [legendRanges, setLegendRanges] = useState<Array<{ color: string; range: string }>>([]);
  const loading = false;
  let hoveredFeature: FeatureLike | null = null;

  const currentMetricConfig = metricConfig || getDefaultMetricConfig(selectedMetric);

  // Enhanced color range calculation with support for different metric types
  const defaultCalculateColorRanges = (values: number[], currency?: string): ColorRange[] => {
    const max = Math.max(...values, 0);
    let ranges: ColorRange[] = [];

    if (max > 0) {
      // Different color schemes based on metric type
      const getColorScheme = () => {
        switch (currentMetricConfig.type) {
          case "monetary":
            return [
              "rgba(21, 101, 192, 0.9)",
              "rgba(30, 136, 229, 0.9)",
              "rgba(66, 165, 245, 0.9)",
              "rgba(144, 202, 249, 0.9)",
              "rgba(227, 242, 253, 0.9)"
            ];
          case "count":
            if (selectedMetric.includes("death") || selectedMetric.includes("casualties")) {
              // Red scheme for mortality
              return [
                "rgba(183, 28, 28, 0.9)",
                "rgba(244, 67, 54, 0.9)",
                "rgba(255, 87, 34, 0.9)",
                "rgba(255, 152, 0, 0.9)",
                "rgba(255, 245, 157, 0.9)"
              ];
            } else if (selectedMetric.includes("affected") || selectedMetric.includes("displaced")) {
              // Orange/amber scheme for population impact
              return [
                "rgba(230, 119, 0, 0.9)",
                "rgba(255, 152, 0, 0.9)",
                "rgba(255, 193, 7, 0.9)",
                "rgba(255, 224, 130, 0.9)",
                "rgba(255, 248, 225, 0.9)"
              ];
            } else if (selectedMetric.includes("events")) {
              // Purple scheme for events
              return [
                "rgba(106, 27, 154, 0.9)",
                "rgba(142, 36, 170, 0.9)",
                "rgba(171, 71, 188, 0.9)",
                "rgba(206, 147, 216, 0.9)",
                "rgba(243, 229, 245, 0.9)"
              ];
            }
            // Default blue scheme
            return [
              "rgba(21, 101, 192, 0.9)",
              "rgba(30, 136, 229, 0.9)",
              "rgba(66, 165, 245, 0.9)",
              "rgba(144, 202, 249, 0.9)",
              "rgba(227, 242, 253, 0.9)"
            ];
          default:
            return [
              "rgba(21, 101, 192, 0.9)",
              "rgba(30, 136, 229, 0.9)",
              "rgba(66, 165, 245, 0.9)",
              "rgba(144, 202, 249, 0.9)",
              "rgba(227, 242, 253, 0.9)"
            ];
        }
      };

      const colors = getColorScheme();

      ranges = colors.map((color, index) => {
        const minVal = index === colors.length - 1 ? 0.1 : max * (1 - (index + 1) * 0.2);
        const maxVal = max * (1 - index * 0.2);

        return {
          min: minVal,
          max: maxVal,
          color,
          label: `${formatValue(minVal, selectedMetric, currentMetricConfig, valueFormatter, currency)} - ${formatValue(maxVal, selectedMetric, currentMetricConfig, valueFormatter, currency)}`
        };
      }).reverse();
    }

    ranges.push(
      { min: 0, max: 0, color: "rgba(255, 255, 255, 0.9)", label: "Zero Impact (Confirmed)" },
      { min: -1, max: -1, color: "rgba(200, 200, 200, 0.9)", label: "No Data Available" }
    );

    return ranges;
  };

  // Calculate color ranges with enhanced filtering
  const colorRanges = useMemo(() => {
    if (!geoData?.features) return [];

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

    const ranges = (customCalculateColorRanges || defaultCalculateColorRanges)(
      allValues,
      currency
    );

    const filteredRanges: ColorRange[] = [];

    if (categorizedData.hasPositiveValues && allValues.length > 0) {
      ranges.forEach((range) => {
        if (range.min === 0 && range.max === 0) return;
        if (range.min === -1 && range.max === -1) return;

        const hasValuesInRange = allValues.some(value =>
          value >= range.min && value <= range.max
        );

        if (hasValuesInRange) {
          filteredRanges.push(range);
        }
      });
    }

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

    return filteredRanges;
  }, [geoData?.features, selectedMetric, currency, customCalculateColorRanges, currentMetricConfig, valueFormatter]);

  // Update legend ranges when color ranges change
  useEffect(() => {
    setLegendRanges(
      colorRanges.map((r) => ({
        color: r.color,
        range: r.label,
      }))
    );
  }, [colorRanges]);

  // Enhanced feature style function
  const getFeatureStyle = useCallback(
    (feature: FeatureLike) => {
      const values = feature.get("values");
      const value = values?.[selectedMetric];
      const dataAvailability = values?.dataAvailability;

      let color = "rgba(200, 200, 200, 0.9)";
      if (dataAvailability === "no_data") {
        color = "rgba(200, 200, 200, 0.9)";
      } else if (value === 0) {
        color = "rgba(255, 255, 255, 0.9)";
      } else if (value > 0) {
        const range = colorRanges.find((r) => value >= r.min && value <= r.max);
        color = range ? range.color : "rgba(200, 200, 200, 0.9)";
      }

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

  // Enhanced tooltip with dynamic metric support
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
      const metricLabel = currentMetricConfig.label;

      const style = getFeatureStyle(feature, 0);
      const fill = style instanceof Style ? style.getFill() : null;
      const backgroundColor = fill ? fill.getColor() as string : "#FFFFFF";

      const textColor = isLightColor(backgroundColor) ? "#333333" : "#FFFFFF";
      const subTextColor = isLightColor(backgroundColor) ? "#666666" : "#EEEEEE";

      let displayValue: string;
      if (dataAvailability === "no_data") {
        displayValue = "No Data Available";
      } else if (value === 0) {
        displayValue = currentMetricConfig.type === "count"
          ? `No ${currentMetricConfig.unit || "impact"}`
          : "Zero Impact (Confirmed)";
      } else if (value > 0) {
        displayValue = formatValue(value, selectedMetric, currentMetricConfig, valueFormatter, currency);
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
    [map, selectedMetric, currency, getFeatureStyle, currentMetricConfig, valueFormatter]
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: getFeatureStyle,
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

    newMap.on("click", (event) => {
      newMap.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (feature instanceof Feature) {
          // Handle feature click for drill-down if needed
        }
      });
    });

    return () => {
      newMap.setTarget(undefined);
      hoveredFeature = null;
    };
  }, [mapRef, geoData]);

  // Event handlers
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

      hoveredFeature = null;
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
      hoveredFeature = null;
    };

    const singleClickHandler = (event: any) => {
      const pixel = map.getEventPixel(event.originalEvent || event);
      let tappedFeature: FeatureLike | null = null;
      map.forEachFeatureAtPixel(pixel, (feature) => {
        tappedFeature = feature as FeatureLike;
      });
      if (tappedFeature) {
        hoveredFeature = tappedFeature;
        updateTooltip(tappedFeature, event.coordinate);
        setTimeout(() => {
          if (tooltip) tooltip.style.display = "none";
          hoveredFeature = null;
        }, 3000);
      } else if (tooltip) {
        tooltip.style.display = "none";
        hoveredFeature = null;
      }
    };

    const moveListener = map.on("pointermove", pointerMoveHandler);
    const startListener = map.on("movestart", moveStartHandler);
    const clickListener = map.on("singleclick", singleClickHandler);

    return () => {
      unByKey(moveListener);
      unByKey(startListener);
      unByKey(clickListener);
      if (tooltip) {
        tooltip.style.display = "none";
      }
    };
  }, [map, updateTooltip]);

  // Update map features when data changes
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

    const extent = source.getExtent();
    if (extent && !extent.some(isNaN) && extent[0] !== Infinity) {
      map.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 8,
        duration: 1000,
      });
    }

    // No cleanup needed for hoveredFeature as it's a regular variable
  }, [map, geoData, selectedMetric, getFeatureStyle]);

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
              : "Please select appropriate filters to view geographic impact data."}
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
        <Legend
          ranges={legendRanges}
          selectedMetric={selectedMetric}
          metricConfig={currentMetricConfig}
          currency={currency}
        />
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

export default ExtendedCustomMap;