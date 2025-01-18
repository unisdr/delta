import React, { useEffect, useState, Suspense, useCallback } from "react";
import { dynamic } from "~/util/dynamic-import";
import "leaflet/dist/leaflet.css";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { fetchImpactData } from "~/routes/api+/analytics+/impact-on-sectors";
import type { GeoJSON as LeafletGeoJSON, Layer } from "leaflet";
import type { MapContainerProps, TileLayerProps, GeoJSONProps } from "react-leaflet";


// Dynamically import leaflet components with correct types using React.lazy
const MapContainer = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.MapContainer }))) as React.ComponentType<MapContainerProps>;
const TileLayer = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.TileLayer }))) as React.ComponentType<TileLayerProps>;
const GeoJSON = React.lazy(() => import('react-leaflet').then(mod => ({ default: mod.GeoJSON }))) 



// Define types
interface FeatureProperties {
  id: number;
  name: string;
  totalDamage: number;
  totalAffected: number;
  totalLoss: number;
}

interface GeoJsonFeature extends Feature<Geometry, FeatureProperties> {}

interface ImpactData extends FeatureCollection<Geometry, FeatureProperties> {
  features: GeoJsonFeature[];
}



// Component that handles the map and data display
const ImpactOnSectorsByLocation: React.FC = () => {
  const [data, setData] = useState<ImpactData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'totalDamage' | 'totalAffected' | 'totalLoss'>('totalDamage');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
 
// Function to load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response: ImpactData = await fetchImpactData();
        setData(response);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Function to handle metric change from user interaction
  const handleMetricChange = useCallback((metric: 'totalDamage' | 'totalAffected' | 'totalLoss') => {
    setSelectedMetric(metric);
  }, []);

  return (
    <div className="dts-page-section">
      <h2 className="dts-heading-2">Impact on Sectors by Location</h2>
        <p>Here’s an explanation.</p>
        {/* Tab controls for selecting the metric */}
        <div className="dts-tablist">
        <button className={`dts-tablist__button ${selectedMetric === 'totalDamage' ? 'active' : 'inactive'}`} onClick={() => setSelectedMetric('totalDamage')}>
          Total Damage
        </button>
        <button className={`dts-tablist__button ${selectedMetric === 'totalAffected' ? 'active' : 'inactive'}`} onClick={() => setSelectedMetric('totalAffected')}>
          Total Affected
        </button>
        <button className={`dts-tablist__button ${selectedMetric === 'totalLoss' ? 'active' : 'inactive'}`} onClick={() => setSelectedMetric('totalLoss')}>
          Total Loss
        </button>
        </div>
      <Suspense fallback={<p>Loading map...</p>}>
      {loading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {!data || data.features.length === 0 ? (
          <div className="dts-placeholder" 
          style={{
            display: 'flex',
            flexDirection: 'column', // Ensures content is stacked vertically
            justifyContent: 'center', // Centers content vertically
            alignItems: 'center', // Centers content horizontally
            height: '100%', // Ensures the div takes full height of its container
            textAlign: 'center', // Centers text horizontally, useful for smaller screens
            padding: '20px' // Adds padding to prevent content from touching the edges
          }}
          >
            <img src="/assets/icons/empty-inbox.svg" alt="No data available"  />
            <span
        style={{
          fontSize: "1.4rem", // Slightly larger font for readability
          color: "#888", // Softer color for a user-friendly design
        }}
      >
        No data available
      </span>
          </div>
          ) : (
        <MapContainer style={{ height: '500px', width: '100%' }} zoom={6} center={[0, 0]}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <GeoJSON
            data={data}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                  const metricValue = feature.properties[selectedMetric];
                const tooltipText = `<strong>${feature.properties.name}</strong><br>${selectedMetric.replace('total', '')}: ${metricValue}`;
                layer.bindTooltip(tooltipText);
              }
            }}
          />
        </MapContainer>
        )}
      </Suspense>
    </div>
  );
};

export default ImpactOnSectorsByLocation;
