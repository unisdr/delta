//app\frontend\analytics\sectors\sections\Map\ImpactMapOl.tsx


import type { GeoData, Filters, MetricConfig } from "~/components/CustomMap";
import CustomMap from "~/components/CustomMap";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";

type ImpactMapProps = {
  geoData: GeoData;
  selectedMetric: string; // Changed from restricted union to flexible string
  filters: Filters;
  currency?: string; // Made optional since not all metrics are monetary
  metricConfig?: MetricConfig; // Added support for metric configuration
  valueFormatter?: (value: number, metric: string) => string; // Added custom formatting support
  calculateColorRanges?: (values: number[], currency?: string) => Array<{
    min: number;
    max: number;
    color: string;
    label: string;
  }>; // Added custom color range support
};

/**
 * ImpactMapOl component that uses the reusable CustomMap component
 * This is now a thin wrapper around CustomMap that maintains backward compatibility
 * while leveraging all the improvements and fixes from the reusable component.
 * 
 */
export default function ImpactMapOl({
  geoData,
  selectedMetric,
  filters,
  currency,
  metricConfig,
  valueFormatter,
  calculateColorRanges
}: ImpactMapProps) {
  return (
    <ErrorBoundary>
      <CustomMap
        geoData={geoData}
        selectedMetric={selectedMetric}
        filters={filters}
        currency={currency}
        metricConfig={metricConfig}
        valueFormatter={valueFormatter}
        calculateColorRanges={calculateColorRanges}
      />
    </ErrorBoundary>
  );
}