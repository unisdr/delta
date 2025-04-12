import React from "react";
import type { GeoData, Filters } from "~/components/CustomMap";
import CustomMap from "~/components/CustomMap";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";

type ImpactMapProps = {
  geoData: GeoData;
  selectedMetric: "totalDamage" | "totalLoss";
  filters: Filters;
};

/**
 * ImpactMapOl component that uses the reusable CustomMap component
 * This is now a thin wrapper around CustomMap that maintains backward compatibility
 * while leveraging all the improvements and fixes from the reusable component
 */
export default function ImpactMapOl({ geoData, selectedMetric, filters }: ImpactMapProps) {
  return (
    <ErrorBoundary>
      <CustomMap
        geoData={geoData}
        selectedMetric={selectedMetric}
        filters={filters}
        apiEndpoint="/api/analytics/geographic-impacts"
        levelCap={3}
      />
    </ErrorBoundary>
  );
}