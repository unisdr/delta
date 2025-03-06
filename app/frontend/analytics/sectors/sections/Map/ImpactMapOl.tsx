import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import { Fill, Stroke, Style } from "ol/style";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import { unByKey } from "ol/Observable";
import { EventsKey } from "ol/events";
import { Feature } from "ol";
import { getCenter } from 'ol/extent';
import { Geometry } from 'ol/geom';
import Swal from "sweetalert2";
import { formatCurrencyWithCode, useDefaultCurrency } from "~/frontend/utils/formatters";
import "./ImpactMap.css"; // Custom styles
import ErrorBoundary from "~/frontend/components/ErrorBoundary";
import Legend from "./Legend";

// Helper function to check if a color is light
const isLightColor = (color: string): boolean => {
  try {
    // Remove any alpha value and convert rgba to hex
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      const [_, r, g, b] = rgbaMatch;
      const brightness = (parseInt(r) * 299 + parseInt(g) * 587 + parseInt(b) * 114) / 1000;
      return brightness > 128;
    }

    // Handle hex colors
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  } catch (error) {
    return false;
  }
};

type ImpactMapProps = {
  geoData: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: {
        id: number;
        name: string;
        level: number;
        parentId: number | null;
        values: {
          totalDamage: number;
          totalLoss: number;
          metadata?: {
            assessmentType: 'rapid' | 'detailed';
            confidenceLevel: 'low' | 'medium' | 'high';
          };
          dataAvailability: 'available' | 'no_data';
        };
      };
      geometry: any;
    }>;
  };
  selectedMetric: "totalDamage" | "totalLoss";
  filters: {
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;
    assessmentType?: 'rapid' | 'detailed';
    confidenceLevel?: 'low' | 'medium' | 'high';
  };
};

type ColorRange = {
  min: number;
  max: number;
  color: string;
  label: string;
}

export default function ImpactMapOl({ geoData, selectedMetric, filters }: ImpactMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [legendRanges, setLegendRanges] = useState<Array<{ color: string, range: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredFeatureColor, setHoveredFeatureColor] = useState<string | null>(null);
  const defaultCurrency = useDefaultCurrency();

  // Fetch data for the current level and parent
  const fetchGeoData = async (level: number, parentId: number | null) => {
    setLoading(true);
    try {
      const url = new URL('/api/analytics/geographic-impacts', window.location.origin);
      const params = new URLSearchParams();

      // Required parameters
      if (filters.sectorId) {
        params.set('sectorId', filters.sectorId);
      }

      // Optional parameters with type checking
      const optionalParams: Array<[keyof typeof filters, string]> = [
        ['subSectorId', 'subSectorId'],
        ['hazardTypeId', 'hazardTypeId'],
        ['hazardClusterId', 'hazardClusterId'],
        ['specificHazardId', 'specificHazardId'],
        ['geographicLevelId', 'geographicLevelId'],
        ['fromDate', 'fromDate'],
        ['toDate', 'toDate'],
        ['disasterEventId', 'disasterEventId'],
        ['assessmentType', 'assessmentType'],
        ['confidenceLevel', 'confidenceLevel']
      ];

      // Add optional parameters if they exist
      optionalParams.forEach(([key, paramName]) => {
        const value = filters[key];
        if (value) {
          params.set(paramName, value);
        }
      });

      // Add level and parentId parameters
      params.set('level', level.toString());
      if (parentId !== null) {
        params.set('parentId', parentId.toString());
      }

      const response = await fetch(`${url.toString()}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch geographic impact data: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || !data.features) {
        throw new Error('Invalid response format from geographic impacts API');
      }

      // Update geoData with the new response
      geoData = data;
    } catch (error) {
      console.error('Error fetching geographic impact data:', error);
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to fetch geographic impact data',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle feature click
  const handleFeatureClick = async (feature: any) => {
    const level = feature.get('level');
    const id = feature.get('id');

    // Only zoom in if we're not at the lowest level (municipality)
    if (level < 3) {
      setLoading(true);
      try {
        // Get the feature extent for smooth zooming
        const extent = feature.getGeometry().getExtent();
        const view = map?.getView();

        // Calculate center and resolution for the extent
        const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
        const resolution = view?.getResolutionForExtent(extent);

        // Animate zoom
        view?.animate({
          center: center,
          resolution: resolution,
          duration: 1000,
          easing: (t: number) => Math.pow(t, 0.5)
        });

        // Update state and fetch new data
        setCurrentLevel(level + 1);
        setCurrentParentId(id);
        await fetchGeoData(level + 1, id);
      } catch (error) {
        console.error('Error during drill-down:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to load detailed view',
          icon: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Memoize color ranges calculation
  const calculateColorRanges = useMemo(() => {
    if (!geoData?.features) return [];

    const values = geoData.features
      .map(f => f.properties?.values?.[selectedMetric])
      .filter(v => typeof v === 'number' && v > 0);

    const max = Math.max(...values, 0);
    let ranges: ColorRange[] = [];

    if (max > 0) {
      ranges = [
        { min: max * 0.8, max: max, color: 'rgba(21, 101, 192, 0.9)', label: `${formatCurrencyWithCode(max * 0.8, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max, defaultCurrency, {}, 'thousands')}` },
        { min: max * 0.6, max: max * 0.8, color: 'rgba(30, 136, 229, 0.9)', label: `${formatCurrencyWithCode(max * 0.6, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.8, defaultCurrency, {}, 'thousands')}` },
        { min: max * 0.4, max: max * 0.6, color: 'rgba(66, 165, 245, 0.9)', label: `${formatCurrencyWithCode(max * 0.4, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.6, defaultCurrency, {}, 'thousands')}` },
        { min: max * 0.2, max: max * 0.4, color: 'rgba(144, 202, 249, 0.9)', label: `${formatCurrencyWithCode(max * 0.2, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.4, defaultCurrency, {}, 'thousands')}` },
        { min: 0.1, max: max * 0.2, color: 'rgba(227, 242, 253, 0.9)', label: `${formatCurrencyWithCode(0.1, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.2, defaultCurrency, {}, 'thousands')}` }
      ];
    }

    ranges.push(
      { min: 0, max: 0, color: 'rgba(255, 255, 255, 0.9)', label: "Zero Impact (Confirmed)" },
      { min: -1, max: -1, color: 'rgba(200, 200, 200, 0.9)', label: "No Data Available" }
    );

    setLegendRanges(ranges.map(r => ({
      color: r.color,
      range: r.label
    })));

    return ranges;
  }, [geoData?.features, selectedMetric, defaultCurrency]);

  // Memoize feature style function
  const getFeatureStyle = useCallback((feature: any, isHovered = false) => {
    const values = feature.get('values');
    const value = values?.[selectedMetric];
    const dataAvailability = values?.dataAvailability;

    // Default color for no data
    let color = 'rgba(200, 200, 200, 0.9)'; // Grey for no data

    if (dataAvailability === 'no_data') {
      color = 'rgba(200, 200, 200, 0.9)'; // Grey for no data
    } else if (value === 0) {
      color = 'rgba(255, 255, 255, 0.9)'; // White for confirmed zero impact
    } else if (value > 0) {
      const range = calculateColorRanges.find(r => value >= r.min && value <= r.max);
      color = range ? range.color : 'rgba(200, 200, 200, 0.9)';
    }

    return new Style({
      fill: new Fill({
        color: color
      }),
      stroke: new Stroke({
        color: isHovered ? '#000' : '#666',
        width: isHovered ? 3 : 1.5,
        lineDash: isHovered ? undefined : [1, 2]
      })
    });
  }, [selectedMetric, calculateColorRanges]);

  // Memoize tooltip update function
  const updateTooltip = useCallback((feature: any, coordinates: number[]) => {
    if (!tooltipRef.current || !map) return;

    const tooltip = tooltipRef.current;
    const pixel = map.getPixelFromCoordinate(coordinates);

    if (!pixel) return;

    const name = feature.get('name')?.en || feature.get('name') || 'Unknown';
    const values = feature.get('values');
    const value = values?.[selectedMetric];
    const dataAvailability = values?.dataAvailability;
    const metricLabel = selectedMetric === 'totalDamage' ? 'Total Damages' : 'Total Losses';

    const featureStyle = getFeatureStyle(feature, false);
    const backgroundColor = (featureStyle.getFill()?.getColor() as string) || '#FFFFFF';
    setHoveredFeatureColor(backgroundColor);

    const textColor = isLightColor(backgroundColor) ? '#333333' : '#FFFFFF';
    const subTextColor = isLightColor(backgroundColor) ? '#666666' : '#EEEEEE';

    let displayValue;
    if (dataAvailability === 'no_data') {
      displayValue = "No Data Available";
    } else if (value === 0) {
      displayValue = "Zero Impact (Confirmed)";
    } else if (value > 0) {
      displayValue = formatCurrencyWithCode(value, defaultCurrency, {}, 'thousands');
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
    tooltip.style.display = 'block';
    tooltip.style.transform = 'translate(-50%, -120%)';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
  }, [map, selectedMetric, defaultCurrency, getFeatureStyle]);

  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    // Find the national level feature (parent_id is null) to center the map
    const nationalFeature = geoData.features.find(
      (feature: any) => feature.properties.parentId === null
    );

    let initialCenter = [0, 0];
    let initialZoom = 5;

    if (nationalFeature) {
      const format = new GeoJSON();
      const olFeature = format.readFeature(nationalFeature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
      }) as Feature<Geometry>;

      // Get the center of the national level polygon
      const geometry = olFeature.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        initialCenter = getCenter(extent);

        // Calculate appropriate zoom level based on extent size
        const width = Math.abs(extent[2] - extent[0]);
        const height = Math.abs(extent[3] - extent[1]);
        const size = Math.max(width, height);
        initialZoom = Math.floor(Math.log2(40000000 / size)) - 1;
      }
    }

    const map = new Map({
      target: mapRef.current,
      layers: [vectorLayer],
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
      }),
    });

    setMap(map);

    // Add features to the map
    const format = new GeoJSON();
    const features = format.readFeatures(geoData, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326'
    });

    vectorSource.addFeatures(features);

    // Fit to vector source extent with padding
    const extent = vectorSource.getExtent();
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [mapRef]);

  useEffect(() => {
    if (!map || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;

    map.on('pointermove', (event) => {
      const pixel = map.getEventPixel(event.originalEvent);
      const hit = map.hasFeatureAtPixel(pixel);

      map.getTargetElement().style.cursor = hit ? 'pointer' : '';

      if (!hit) {
        tooltip.style.display = 'none';
        return;
      }

      let hoveredFeature: any = null;
      map.forEachFeatureAtPixel(pixel, (feature) => {
        hoveredFeature = feature;
      });

      if (hoveredFeature) {
        updateTooltip(hoveredFeature, event.coordinate);
      } else {
        tooltip.style.display = 'none';
      }
    });

    map.on('movestart', () => {
      tooltip.style.display = 'none';
    });

  }, [map, selectedMetric]);

  useEffect(() => {
    if (!map || !geoData?.features) return;

    const vectorLayer = map.getLayers().getArray().find(layer => layer instanceof VectorLayer) as VectorLayer<VectorSource>;
    if (!vectorLayer) {
      const newVectorLayer = new VectorLayer({
        source: new VectorSource(),
        style: (feature) => getFeatureStyle(feature, false) // Wrapper function
      });
      map.addLayer(newVectorLayer);
    } else {
      // Update the vector layer style with a wrapper function
      vectorLayer.setStyle((feature) => getFeatureStyle(feature, false));
    }

    const source = vectorLayer?.getSource();
    source?.clear();

    const geoJsonFeatures = new GeoJSON().readFeatures(geoData, {
      featureProjection: 'EPSG:3857'
    });

    // Set consistent properties for each feature
    geoJsonFeatures.forEach(feature => {
      feature.set('totalDamage', feature.get('totalDamage') || 0);
      feature.set('totalLoss', feature.get('totalLoss') || 0);
    });

    source?.addFeatures(geoJsonFeatures);

    // Set consistent view for both maps
    const extent = source?.getExtent();
    if (extent && !extent.some(isNaN) && extent[0] !== Infinity && extent[2] !== -Infinity) {
      const view = map.getView();
      view.fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 5.5, // Set consistent max zoom
        duration: 1000
      });
    }
  }, [map, geoData, selectedMetric]);

  // Reset view when filters change
  useEffect(() => {
    if (!map || !filters) return;
    setCurrentLevel(1);
    setCurrentParentId(null);
  }, [filters]);

  // Add empty state check
  if (!geoData?.features || geoData.features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg">
        <div className="text-gray-500 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No geographic data available</h3>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="impact-map-container">
        <div ref={mapRef} className="map" />
        <div ref={tooltipRef} className="map-tooltip" />
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
          </div>
        )}
        <Legend ranges={legendRanges} selectedMetric={selectedMetric} />
      </div>
    </ErrorBoundary>
  );
}