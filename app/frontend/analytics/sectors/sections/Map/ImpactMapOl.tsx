import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import Overlay from "ol/Overlay";
import { pointerMove } from "ol/events/condition";
import Select from "ol/interaction/Select";
import { getCenter } from 'ol/extent';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import Swal from "sweetalert2";
import { formatCurrency } from "~/frontend/utils/formatters";
import "./ImpactMap.css"; // Custom styles

type ImpactMapProps = {
  geoData: any;
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
  };
};

type DivisionFeature = {
  type: "Feature";
  properties: {
    id: number;
    parent_id: number | null;
    name: { en: string };
    level: number;
    spatial_index: string;
    [key: string]: any;
  };
  geometry: any;
};

export default function ImpactMap({ geoData, selectedMetric, filters }: ImpactMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [legendRanges, setLegendRanges] = useState<Array<{ color: string, range: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredFeatureColor, setHoveredFeatureColor] = useState<string | null>(null);

  // Fetch data for the current level and parent
  const fetchGeoData = async (level: number, parentId: number | null) => {
    setLoading(true);
    try {
      const url = new URL('http://localhost:3000/api/analytics/geographic-impacts');

      // Always send sectorId
      url.searchParams.set('sectorId', filters.sectorId || '');

      // Send subSectorId if it exists and is not empty
      if (filters.subSectorId) {
        url.searchParams.set('subSectorId', filters.subSectorId);
      }

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

  // Style function for features
  const calculateColorRanges = (features: any[]) => {
    const values = features.map(f => f.properties[selectedMetric]);
    const nonZeroValues = values.filter(v => v > 0);
    const max = Math.max(...nonZeroValues, 0); // Ensure at least '0' is considered if all are zero

    const noDataColor = 'rgba(200, 200, 200, 0.9)'; // Light grey for no impact
    let ranges;

    if (max === 0) { // If max is 0, it implies there are no non-zero values
      ranges = [{ min: 0, max: 0, color: noDataColor, label: "No data available" }];
    } else {
      ranges = [
        { min: 0, max: 0, color: noDataColor, label: "No data available" },
        { min: 0.1, max: max * 0.2, color: 'rgba(227, 242, 253, 0.9)', label: "0.1% - " + (max * 0.2 * 100).toFixed(2) + "%" },
        { min: max * 0.2, max: max * 0.4, color: 'rgba(144, 202, 249, 0.9)', label: (max * 0.2 * 100).toFixed(2) + "% - " + (max * 0.4 * 100).toFixed(2) + "%" },
        { min: max * 0.4, max: max * 0.6, color: 'rgba(66, 165, 245, 0.9)', label: (max * 0.4 * 100).toFixed(2) + "% - " + (max * 0.6 * 100).toFixed(2) + "%" },
        { min: max * 0.6, max: max * 0.8, color: 'rgba(30, 136, 229, 0.9)', label: (max * 0.6 * 100).toFixed(2) + "% - " + (max * 0.8 * 100).toFixed(2) + "%" },
        { min: max * 0.8, max: max, color: 'rgba(21, 101, 192, 0.9)', label: (max * 0.8 * 100).toFixed(2) + "% - " + (max * 100).toFixed(2) + "%" }
      ];
    }

    // Ensure the range property is never undefined
    setLegendRanges(ranges.map(r => ({
      color: r.color,
      range: r.label // Always has a value now
    })).reverse()); // Reverse to display No Data at the top when applicable

    return ranges;
  };

  const getFeatureStyle = (feature: any, isHovered = false) => {
    const value = feature.get(selectedMetric);
    const ranges = calculateColorRanges(geoData.features);
    const range = ranges.find(r => value >= r.min && value <= r.max);

    return new Style({
      fill: new Fill({
        color: range ? range.color : 'rgba(240,240,240,0.9)' // Use the default color if no range matches
      }),
      stroke: new Stroke({
        color: isHovered ? '#000' : '#666',
        width: isHovered ? 3 : 1.5,
        lineDash: isHovered ? undefined : [1, 2]
      })
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
    vectorLayer.setStyle((feature) => getFeatureStyle(feature, false));

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

    // Only fit to extent if we have features and a valid extent
    const extent = source?.getExtent();
    const view = map.getView();

    if (extent && !extent.some(isNaN) && extent[0] !== Infinity && extent[2] !== -Infinity) {
      const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
      const resolution = view.getResolutionForExtent(extent);
      const maxResolution = view.getResolutionForZoom(12); // maxZoom: 12

      view.animate({
        center: center,
        resolution: Math.max(resolution, maxResolution),
        duration: 1000
      });
    } else {
      // If no valid extent, reset to default Philippines view
      view.animate({
        center: fromLonLat([121.774017, 12.879721]),
        zoom: 5,
        duration: 1000
      });
    }
  };

  // Helper function to check if a color is light
  const isLightColor = (color: string) => {
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

  // Function to update tooltip content and style
  const updateTooltip = (feature: any, coordinates: number[]) => {
    if (!tooltipRef.current || !map) return;

    const tooltip = tooltipRef.current;
    const pixel = map.getPixelFromCoordinate(coordinates);

    if (!pixel) return;

    const name = feature.get('name')?.en || feature.get('name') || 'Unknown';
    const value = feature.get(selectedMetric);
    const metricLabel = selectedMetric === 'totalDamage' ? 'Total Damages' : 'Total Losses';

    // Handle the value display logic - only two states
    const displayValue = value === null || value === undefined
      ? "No data available"
      : formatCurrency(value);

    // Get the feature's color from the style
    const featureStyle = getFeatureStyle(feature, false);
    const fillColor = (featureStyle.getFill()?.getColor() as string) || '#FFFFFF';
    setHoveredFeatureColor(fillColor);

    // Determine text color based on background brightness
    const textColor = isLightColor(fillColor) ? '#333333' : '#FFFFFF';

    tooltip.style.display = 'block';
    tooltip.style.left = `${pixel[0]}px`;
    tooltip.style.top = `${pixel[1]}px`;
    tooltip.style.backgroundColor = fillColor;
    tooltip.style.color = textColor;
    tooltip.style.border = '1px solid rgba(0,0,0,0.1)';
    tooltip.style.borderRadius = '4px';
    tooltip.style.padding = '8px 12px';
    tooltip.style.fontSize = '14px';
    tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    tooltip.style.zIndex = '1000';
    tooltip.style.minWidth = '200px';
    tooltip.style.transform = 'translate(-50%, -100%)';
    tooltip.style.marginTop = '-8px';

    tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${name}</div>
        <div style="opacity: 0.9">${metricLabel}: ${displayValue}</div>
    `;
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    // Find the national level feature (parent_id is null) to center the map
    const nationalFeature = geoData.features.find(
      (feature: DivisionFeature) => feature.properties.parent_id === null
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

  return (
    <div className="map-container">
      <div
        ref={mapRef}
        className="map"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />
      <div
        ref={tooltipRef}
        className="tooltip"
        style={{
          display: 'none',
          position: 'absolute',
          backgroundColor: hoveredFeatureColor || 'white',
          color: hoveredFeatureColor && isLightColor(hoveredFeatureColor) ? '#333333' : '#FFFFFF',
        }}
      />
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      {legendRanges.length > 0 && (
        <div className="legend">
          <h3>Legend</h3>
          <div className="legend-items">
            {legendRanges.map((range, index) => (
              <div key={index} className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: range.color }}
                />
                <span>{range.range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}