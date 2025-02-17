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

export default function ImpactMap({ geoData, selectedMetric, filters }: ImpactMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [legendRanges, setLegendRanges] = useState<Array<{ color: string, range: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
    const values = features.map(f => f.properties[selectedMetric] || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Create logarithmic scale for better distribution
    const getLogScale = (value: number) => {
      if (value <= 0) return 0;
      return Math.log(value + 1) / Math.log(max + 1);
    };

    const ranges = [
      { min: 0, max: max * 0.2, color: '#E3F2FD' },
      { min: max * 0.2, max: max * 0.4, color: '#90CAF9' },
      { min: max * 0.4, max: max * 0.6, color: '#42A5F5' },
      { min: max * 0.6, max: max * 0.8, color: '#1E88E5' },
      { min: max * 0.8, max: max, color: '#1565C0' }
    ];

    setLegendRanges(ranges.map(r => ({
      color: r.color,
      range: `${Math.round(r.min).toLocaleString()} - ${Math.round(r.max).toLocaleString()}`
    })));

    return ranges;
  };

  const getFeatureStyle = (feature: any, isHovered = false) => {
    const value = feature.get(selectedMetric) || 0;
    const ranges = calculateColorRanges(geoData.features);
    const range = ranges.find(r => value >= r.min && value <= r.max);

    return new Style({
      fill: new Fill({
        color: range ? range.color : 'rgba(255,255,255,0.5)'
      }),
      stroke: new Stroke({
        color: isHovered ? '#000' : '#666',
        width: isHovered ? 2 : 1
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

  useEffect(() => {
    if (!mapRef.current) return;

    const philippinesCenter = fromLonLat([121.774017, 12.879721]); // Philippines center coordinates
    const initialZoom = 5.5; // Set a consistent initial zoom level

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: philippinesCenter,
        zoom: initialZoom,
        constrainResolution: true // This ensures consistent zoom levels
      })
    });

    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
    };
  }, [mapRef]);

  useEffect(() => {
    if (!map) return;

    // Remove existing hover interactions and overlays
    map.getInteractions().getArray()
      .filter(interaction => interaction instanceof Select)
      .forEach(interaction => map.removeInteraction(interaction));

    map.getOverlays().clear();

    // Tooltip Overlay with offset and positioning
    const tooltip = new Overlay({
      element: tooltipRef.current!,
      offset: [10, 0],
      positioning: 'bottom-left',
      stopEvent: false // Prevents the tooltip from interfering with map events
    });
    map.addOverlay(tooltip);

    // Hover Interaction with debounced tooltip update
    let hoveredFeature: any = null;
    const selectHover = new Select({
      condition: pointerMove,
      style: (feature) => getFeatureStyle(feature, true),
    });

    selectHover.on('select', (e) => {
      const selected = e.selected[0];
      if (selected) {
        hoveredFeature = selected;
        const tooltipElement = tooltipRef.current;
        if (tooltipElement) {
          tooltipElement.style.display = 'block';
          const value = Number(selected.get(selectedMetric)).toLocaleString();
          const metricLabel = selectedMetric === 'totalDamage' ? 'Total Damage' : 'Total Loss';

          tooltipElement.innerHTML = `
            <div class="tooltip-content">
              <div class="region-name">${selected.get('name').en}</div>
              <div class="metric-value">${metricLabel}: ${value}</div>
            </div>
          `;
          tooltip.setPosition(e.mapBrowserEvent.coordinate);
        }
      } else {
        hoveredFeature = null;
        const tooltipElement = tooltipRef.current;
        if (tooltipElement) {
          tooltipElement.style.display = 'none';
        }
      }
    });

    map.addInteraction(selectHover);

    // Update tooltip position on mouse move
    const moveListener = (evt: any) => {
      if (hoveredFeature) {
        tooltip.setPosition(evt.coordinate);
      }
    };
    map.on('pointermove', moveListener);

    return () => {
      map.removeInteraction(selectHover);
      map.un('pointermove', moveListener);
      map.removeOverlay(tooltip);
    };
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
      </div>

      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ width: "100%", height: "500px" }} />
        <div ref={tooltipRef} className="map-tooltip" />
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
    </div>
  );
}