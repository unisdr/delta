## Color Scheme Strategies for Different Metrics

Different metrics require different visual approaches:

### Mortality/Casualty Metrics (deaths, injured)
Use red color schemes to convey severity:

```typescript
const mortalityColors = {
  deaths: [
    "rgba(255, 245, 245, 0.9)", // Very light red
    "rgba(255, 205, 205, 0.9)", // Light red  
    "rgba(255, 154, 154, 0.9)", // Medium red
    "rgba(244, 67, 54, 0.9)",   // Red
    "rgba(183, 28, 28, 0.9)"    // Dark red
  ],
  injured: [
    "rgba(255, 243, 224, 0.9)", // Light orange
    "rgba(255, 204, 128, 0.9)", // Orange
    "rgba(255, 152, 0, 0.9)",   // Dark orange
    "rgba(230, 119, 0, 0.9)",   // Darker orange  
    "rgba(191, 85, 0, 0.9)"     // Very dark orange
  ]
};
```

### Population Impact Metrics (affected, displaced)
Use warm colors to show human impact:

```typescript  
const populationColors = {
  affectedPeople: [
    "rgba(255, 248, 225, 0.9)", // Light amber
    "rgba(255, 224, 130, 0.9)", // Amber
    "rgba(255, 193, 7, 0.9)",   // Gold
    "rgba(255, 152, 0, 0.9)",   // Orange
    "rgba(230, 119, 0, 0.9)"    // Dark orange
  ],
  displaced: [
    "rgba(232, 245, 233, 0.9)", // Light green
    "rgba(165, 214, 167, 0.9)", // Green
    "rgba(102, 187, 106, 0.9)", // Medium green
    "rgba(67, 160, 71, 0.9)",   // Dark green
    "rgba(46, 125, 50, 0.9)"    // Very dark green
  ]
};
```

### Event Count Metrics
Use purple/violet schemes for frequency:

```typescript
const eventColors = [
  "rgba(243, 229, 245, 0.9)", // Light purple
  "rgba(206, 147, 216, 0.9)", // Purple
  "rgba(171, 71, 188, 0.9)",  // Medium purple
  "rgba(142, 36, 170, 0.9)",  // Dark purple
  "rgba(106, 27, 154, 0.9)"   // Very dark purple
];
```

## Component Modifications Required

To fully support these extended metrics, you'll need to modify the CustomMap component:

### 1. Update the selectedMetric type

```typescript
// In CustomMap.tsx, change this line:
selectedMetric: "totalDamage" | "totalLoss";

// To this:
selectedMetric: string; // Allow any metric name
```

### 2. Update the tooltip display logic

```typescript
// In the updateTooltip function, replace the hardcoded metric label:
const metricLabel = selectedMetric === "totalDamage" ? "Total Damages" : "Total Losses";

// With a dynamic approach:
const getMetricLabel = (metric: string, config?: MetricConfig) => {
  if (config?.label) return config.label;
  
  const defaultLabels = {
    totalDamage: "Total Damages",
    totalLoss: "Total Losses", 
    deaths: "Fatalities",
    injured: "Injuries",
    affectedPeople: "Affected Population",
    displaced: "Displaced People",
    homeless: "Homeless People",
    numberOfEvents: "Number of Events"
  };
  
  return defaultLabels[metric] || metric.charAt(0).toUpperCase() + metric.slice(1);
};

const metricLabel = getMetricLabel(selectedMetric, metricConfig);
```

### 3. Update value formatting in tooltips

```typescript
// Replace the existing displayValue logic with:
let displayValue: string;
if (dataAvailability === "no_data") {
  displayValue = "No Data Available";
} else if (value === 0) {
  displayValue = metricConfig?.type === "count" ? `No ${metricConfig.unit || "items"}` : "Zero Impact (Confirmed)";
} else if (value > 0) {
  displayValue = valueFormatter ? 
    valueFormatter(value, selectedMetric) : 
    formatDefaultValue(value, selectedMetric, metricConfig);
} else {
  displayValue = "No Data Available";
}
```

### 4. Update Legend component integration

```typescript
// Pass metric type to Legend component:
<Legend 
  ranges={legendRanges} 
  selectedMetric={selectedMetric}
  metricConfig={metricConfig}
  currency={currency}
/>
```

## Advanced Usage Examples

### Pattern 5: Real-time Disaster Monitoring

```typescript
function RealTimeDisasterMap() {
  const [selectedMetric, setSelectedMetric] = useState("numberOfEvents");
  const [timeRange, setTimeRange] = useState("24h");
  
  const { data: liveData } = useQuery({
    queryKey: ["disaster-events", timeRange],
    queryFn: () => fetchLiveDisasterData(timeRange),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const transformedData = useMemo(() => {
    if (!liveData) return null;
    
    return {
      type: "FeatureCollection",
      features: liveData.map(event => ({
        type: "Feature",
        geometry: event.impact_area,
        properties: {
          id: event.id,
          name: event.location_name,
          level: 1,
          parentId: null,
          values: {
            numberOfEvents: event.event_count,
            deaths: event.casualties.confirmed_deaths,
            injured: event.casualties.injured,
            affectedPeople: event.population_impact.affected,
            
            // Real-time specific metrics
            activeRescueOperations: event.response.active_rescues,
            emergencyShelters: event.response.shelters_opened,
            evacuationOrders: event.response.evacuation_orders,
            
            dataAvailability: event.verified ? 'available' : 'no_data',
            metadata: {
              assessmentType: "rapid",
              confidenceLevel: event.data_confidence,
              lastUpdated: event.last_updated,
              isOngoing: event.status === "ongoing"
            }
          }
        }
      }))
    };
  }, [liveData]);

  const metricConfigs = {
    numberOfEvents: {
      type: "count" as const,
      unit: "events",
      label: "Active Events",
      colors: eventColors
    },
    deaths: {
      type: "count" as const,
      unit: "people",
      label: "Confirmed Casualties",
      colors: mortalityColors.deaths
    },
    affectedPeople: {
      type: "count" as const,
      unit: "people", 
      label: "People Affected",
      colors: populationColors.affectedPeople
    },
    activeRescueOperations: {
      type: "count" as const,
      unit: "operations",
      label: "Active Rescues",
      colors: ["rgba(232, 245, 233, 0.9)", "rgba(129, 199, 132, 0.9)", "rgba(76, 175, 80, 0.9)", "rgba(56, 142, 60, 0.9)", "rgba(27, 94, 32, 0.9)"]
    }
  };

  return (
    <div className="real-time-disaster-map">
      <div className="map-controls">
        <div className="time-range-selector">
          <button 
            className={timeRange === "1h" ? "active" : ""}
            onClick={() => setTimeRange("1h")}
          >
            Last Hour
          </button>
          <button 
            className={timeRange === "24h" ? "active" : ""}
            onClick={() => setTimeRange("24h")}
          >
            Last 24 Hours
          </button>
          <button 
            className={timeRange === "7d" ? "active" : ""}
            onClick={() => setTimeRange("7d")}
          >
            Last Week
          </button>
        </div>
        
        <div className="metric-selector">
          {Object.entries(metricConfigs).map(([key, config]) => (
            <button
              key={key}
              className={selectedMetric === key ? "active" : ""}
              onClick={() => setSelectedMetric(key)}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {transformedData && (
        <CustomMap
          geoData={transformedData}
          selectedMetric={selectedMetric}
          filters={{}}
          metricConfig={metricConfigs[selectedMetric]}
          valueFormatter={createValueFormatter(metricConfigs)}
          calculateColorRanges={(values) => {
            const config = metricConfigs[selectedMetric];
            const max = Math.max(...values);
            
            return config.colors.map((color, index) => ({
              min: index === 0 ? 0.1 : max * (index * 0.2),
              max: index === config.colors.length - 1 ? max : max * ((index + 1) * 0.2),
              color,
              label: `Level ${index + 1}`
            }));
          }}
        />
      )}
      
      <div className="live-data-indicator">
        <span className="status-dot blinking"></span>
        Live Data - Last Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
```

### Pattern 6: Comparative Analysis Dashboard

```typescript
function ComparativeAnalysisMap({ baselineData, currentData }) {
  const [comparisonMode, setComparisonMode] = useState<"absolute" | "relative">("absolute");
  const [selectedMetric, setSelectedMetric] = useState("affectedPeople");

  const transformedData = useMemo(() => {
    const combinedData = baselineData.map(baseline => {
      const current = currentData.find(c => c.region_id === baseline.region_id);
      
      return {
        type: "Feature",
        geometry: baseline.geometry,
        properties: {
          id: baseline.region_id,
          name: baseline.region_name,
          level: 1,
          parentId: null,
          values: {
            // Current values
            affectedPeople: current?.affected || 0,
            deaths: current?.deaths || 0,
            displaced: current?.displaced || 0,
            
            // Baseline values for comparison
            baselineAffected: baseline.affected || 0,
            baselineDeaths: baseline.deaths || 0,
            baselineDisplaced: baseline.displaced || 0,
            
            // Calculated differences
            affectedPeopleDiff: (current?.affected || 0) - (baseline.affected || 0),
            deathsDiff: (current?.deaths || 0) - (baseline.deaths || 0),
            displacedDiff: (current?.displaced || 0) - (baseline.displaced || 0),
            
            // Percentage changes
            affectedPeopleChange: baseline.affected ? 
              ((current?.affected || 0) - baseline.affected) / baseline.affected * 100 : 0,
            deathsChange: baseline.deaths ?
              ((current?.deaths || 0) - baseline.deaths) / baseline.deaths * 100 : 0,
            displacedChange: baseline.displaced ?
              ((current?.displaced || 0) - baseline.displaced) / baseline.displaced * 100 : 0,
            
            dataAvailability: (current?.affected || current?.deaths || current?.displaced) ? 'available' : 'no_data'
          }
        }
      };
    });

    return { type: "FeatureCollection", features: combinedData };
  }, [baselineData, currentData]);

  const getDisplayMetric = () => {
    if (comparisonMode === "relative") {
      return `${selectedMetric}Change`;
    }
    return selectedMetric;
  };

  const metricConfigs = {
    affectedPeople: {
      type: "count" as const,
      unit: "people",
      label: "Affected Population"
    },
    affectedPeopleChange: {
      type: "percentage" as const,
      label: "Change in Affected Population"
    },
    deaths: {
      type: "count" as const,
      unit: "people",
      label: "Fatalities"
    },
    deathsChange: {
      type: "percentage" as const,
      label: "Change in Fatalities"
    }
  };

  return (
    <div className="comparative-analysis-map">
      <div className="analysis-controls">
        <div className="comparison-mode">
          <button 
            className={comparisonMode === "absolute" ? "active" : ""}
            onClick={() => setComparisonMode("absolute")}
          >
            Absolute Values
          </button>
          <button 
            className={comparisonMode === "relative" ? "active" : ""}
            onClick={() => setComparisonMode("relative")}
          >
            Percentage Change
          </button>
        </div>
      </div>

      <CustomMap
        geoData={transformedData}
        selectedMetric={getDisplayMetric()}
        filters={{}}
        metricConfig={metricConfigs[getDisplayMetric()]}
        valueFormatter={(value, metric) => {
          if (metric.endsWith("Change")) {
            const sign = value > 0 ? "+" : "";
            return `${sign}${value.toFixed(1)}%`;
          }
          return formatters[selectedMetric]?.(value) || value.toString();
        }}
        calculateColorRanges={(values) => {
          if (comparisonMode === "relative") {
            // For percentage changes, use diverging color scheme
            const max = Math.max(...values.map(Math.abs));
            return [
              { min: -max, max: -max * 0.6, color: "rgba(183, 28, 28, 0.9)", label: "Large Decrease" },
              { min: -max * 0.6, max: -max * 0.2, color: "rgba(244, 67, 54, 0.9)", label: "Moderate Decrease" },
              { min: -max * 0.2, max: max * 0.2, color: "rgba(255, 255, 255, 0.9)", label: "No Change" },
              { min: max * 0.2, max: max * 0.6, color: "rgba(76, 175, 80, 0.9)", label: "Moderate Increase" },
              { min: max * 0.6, max: max, color: "rgba(27, 94, 32, 0.9)", label: "Large Increase" }
            ];
          } else {
            // For absolute values, use standard progression
            const max = Math.max(...values);
            const colors = populationColors[selectedMetric] || populationColors.affectedPeople;
            return colors.map((color, index) => ({
              min: index === 0 ? 0.1 : max * (index * 0.2),
              max: max * ((index + 1) * 0.2),
              color,
              label: `Range ${index + 1}`
            }));
          }
        }}
      />
    </div>
  );
}
```

This comprehensive update transforms the CustomMap component from a monetary-only visualization tool into a flexible, multi-metric mapping system that can handle deaths, affected populations, event counts, and any other quantitative metrics you might need in the future. The key improvements include:

1. **Extended data model** supporting multiple metric types
2. **Flexible formatting** for different value types (monetary, count, percentage)
3. **Color scheme strategies** appropriate for different data types
4. **Comprehensive transformation helpers** for various data sources
5. **Real-world integration patterns** showing practical implementations
6. **Component modification guidance** for updating the existing code

The design is future-proof and can easily accommodate new metrics as your requirements evolve.# CustomMap Integration Guide

A comprehensive guide for integrating the CustomMap component (`app/components/CustomMap.tsx`) into your applications.

## Quick Start

### Required Dependencies

Before using CustomMap, ensure you have these dependencies in your project:

```bash
npm install ol react
npm install --save-dev @types/ol
```

### Essential Imports

```typescript
import CustomMap from "~/components/CustomMap";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";
import Legend from "~/frontend/analytics/sectors/sections/Map/Legend";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";
import "~/frontend/analytics/sectors/sections/Map/ImpactMap.css";
```

### Basic Usage

```typescript
import CustomMap from "~/components/CustomMap";

function MyMapComponent({ data }) {
  // Transform your data to GeoJSON format
  const geoData = {
    type: "FeatureCollection",
    features: data.map(item => ({
      type: "Feature",
      geometry: item.geometry, // Your GeoJSON geometry
      properties: {
        id: item.id,
        name: item.name,
        level: 1,
        parentId: null,
        values: {
          totalDamage: item.damage || 0,
          totalLoss: item.loss || 0,
          dataAvailability: (item.damage || item.loss) ? 'available' : 'no_data'
        }
      }
    }))
  };

  return (
    <ErrorBoundary>
      <CustomMap
        geoData={geoData}
        selectedMetric="totalDamage"
        filters={{}}
        currency="USD"
      />
    </ErrorBoundary>
  );
}
```

## Component Architecture

The CustomMap component is part of a modular system with clear separation of concerns:

```
CustomMap.tsx (Core component)
├── ImpactMapOl.tsx (Wrapper/Integration layer)
├── Legend.tsx (Legend component)
└── ImpactMap.css (Styling)
```

## Props Interface

```typescript
interface CustomMapProps {
  geoData: GeoData;                    // GeoJSON FeatureCollection
  selectedMetric: "totalDamage" | "totalLoss" | "deaths" | "affectedPeople" | "numberOfEvents" | string;
  filters: Filters;                    // Filter state
  apiEndpoint?: string;                // Optional API endpoint
  levelCap?: number;                   // Max drill-down level
  calculateColorRanges?: (values: number[], currency?: string) => ColorRange[];
  currency?: string;                   // Currency code (only for monetary values)
  valueFormatter?: (value: number, metric: string) => string;  // Custom value formatting
  metricConfig?: {
    type: "monetary" | "count" | "percentage";
    unit?: string;                     // e.g., "people", "events", "%"
    label: string;                     // Display label for the metric
  };
}
```

### Data Types

```typescript
interface GeoFeatureProperties {
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
    affectedPeople?: number;
    numberOfEvents?: number;
    injured?: number;
    displaced?: number;
    homeless?: number;
    
    // Metadata
    metadata?: {
      assessmentType: "rapid" | "detailed";
      confidenceLevel: "low" | "medium" | "high";
      lastUpdated?: string;
    };
    dataAvailability: "available" | "no_data";
    
    // Custom metrics (flexible for future extensions)
    [key: string]: number | string | object | undefined;
  };
}

interface GeoData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface Filters {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  // ... other filter properties
}
```

## Extended Metrics Support

The CustomMap component supports both monetary and quantitative metrics. Here's how to work with different value types:

### Monetary Metrics
- `totalDamage` - Economic damages in currency
- `totalLoss` - Economic losses in currency

### Quantitative Metrics  
- `deaths` - Number of fatalities
- `affectedPeople` - Number of people affected
- `numberOfEvents` - Count of disaster events
- `injured` - Number of injured people
- `displaced` - Number of displaced people
- `homeless` - Number of homeless people

### Metric Configuration

```typescript
interface MetricConfig {
  type: "monetary" | "count" | "percentage";
  unit?: string;       // e.g., "people", "events", "%"
  label: string;       // Display label
  formatOptions?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    notation?: "compact" | "standard";
  };
}

// Usage examples
const metricConfigs = {
  totalDamage: {
    type: "monetary",
    label: "Total Economic Damage",
    unit: "USD"
  },
  deaths: {
    type: "count", 
    label: "Number of Deaths",
    unit: "people",
    formatOptions: { notation: "compact" }
  },
  affectedPeople: {
    type: "count",
    label: "Affected Population", 
    unit: "people",
    formatOptions: { notation: "compact" }
  },
  numberOfEvents: {
    type: "count",
    label: "Disaster Events",
    unit: "events"
  }
};
```
- Automatically colors regions based on data values
- 5-tier color scheme from light to dark blue
- Special handling for zero values (white) and no data (gray)

## Key Features

### 1. Interactive Choropleth Mapping
- Automatically colors regions based on data values
- 5-tier color scheme from light to dark blue
- Special handling for zero values (white) and no data (gray)
- Supports both monetary and quantitative metrics

### 2. Flexible Value Formatting
- Monetary values: Currency formatting with compact notation
- Count values: Number formatting with "people", "events", etc. units
- Custom formatters for specialized metrics

### 3. Responsive Tooltips
- Desktop: Hover interactions
- Mobile/Tablet: Touch interactions with auto-hide  
- Adaptive text colors based on background brightness
- Context-aware formatting based on metric type
- Only shows ranges that have actual data
- Currency-aware formatting
- Responsive positioning (moves below map on mobile)

### 4. Touch-Friendly Design
- Single-click/tap tooltip display
- Proper mobile viewport handling
- Responsive legend placement

## Integration Patterns

### Pattern 1: Deaths and Casualties Mapping

```typescript
function CasualtyMap({ casualtyData }) {
  const transformedData = useMemo(() => ({
    type: "FeatureCollection",
    features: casualtyData.map(item => ({
      type: "Feature",
      geometry: item.geojson,
      properties: {
        id: item.region_id,
        name: item.region_name,
        level: 1,
        parentId: null,
        values: {
          deaths: item.total_deaths || 0,
          injured: item.total_injured || 0,
          missing: item.total_missing || 0,
          dataAvailability: (item.total_deaths + item.total_injured) > 0 ? 'available' : 'no_data'
        }
      }
    }))
  }), [casualtyData]);

  const deathsFormatter = useCallback((value: number) => {
    if (value === 0) return "No casualties reported";
    if (value >= 1000) return `${(value/1000).toFixed(1)}K people`;
    return `${value.toLocaleString()} people`;
  }, []);

  return (
    <CustomMap
      geoData={transformedData}
      selectedMetric="deaths"
      filters={{}}
      valueFormatter={deathsFormatter}
      metricConfig={{
        type: "count",
        unit: "people",
        label: "Fatalities"
      }}
      calculateColorRanges={(values) => {
        const max = Math.max(...values);
        return [
          { min: max * 0.8, max: max, color: "rgba(139, 0, 0, 0.9)", label: "Critical (>80%)" },
          { min: max * 0.6, max: max * 0.8, color: "rgba(205, 92, 92, 0.9)", label: "High (60-80%)" },
          { min: max * 0.4, max: max * 0.6, color: "rgba(240, 128, 128, 0.9)", label: "Moderate (40-60%)" },
          { min: max * 0.2, max: max * 0.4, color: "rgba(255, 182, 193, 0.9)", label: "Low (20-40%)" },
          { min: 0.1, max: max * 0.2, color: "rgba(255, 228, 225, 0.9)", label: "Minimal (<20%)" }
        ];
      }}
    />
  );
}
```

### Pattern 2: Affected Population Mapping

```typescript
function AffectedPopulationMap({ populationData }) {
  const [selectedMetric, setSelectedMetric] = useState<"affectedPeople" | "displaced" | "homeless">("affectedPeople");
  
  const transformedData = useMemo(() => ({
    type: "FeatureCollection", 
    features: populationData.map(item => ({
      type: "Feature",
      geometry: item.geometry,
      properties: {
        id: item.id,
        name: item.admin_name,
        level: item.admin_level,
        parentId: item.parent_id,
        values: {
          affectedPeople: item.affected_count || 0,
          displaced: item.displaced_count || 0,
          homeless: item.homeless_count || 0,
          totalPopulation: item.total_population || 0,
          dataAvailability: item.has_population_data ? 'available' : 'no_data'
        }
      }
    }))
  }), [populationData]);

  const populationFormatter = useCallback((value: number, metric: string) => {
    if (value === 0) return "No affected population";
    
    const formatNumber = (num: number) => {
      if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
      if (num >= 1_000) return `${(num/1_000).toFixed(1)}K`;
      return num.toLocaleString();
    };

    const labels = {
      affectedPeople: "people affected",
      displaced: "people displaced", 
      homeless: "people homeless"
    };

    return `${formatNumber(value)} ${labels[metric] || "people"}`;
  }, []);

  return (
    <div>
      <div className="metric-selector">
        <button 
          className={selectedMetric === 'affectedPeople' ? 'active' : ''}
          onClick={() => setSelectedMetric('affectedPeople')}
        >
          Affected Population
        </button>
        <button 
          className={selectedMetric === 'displaced' ? 'active' : ''}
          onClick={() => setSelectedMetric('displaced')}
        >
          Displaced People
        </button>
        <button 
          className={selectedMetric === 'homeless' ? 'active' : ''}
          onClick={() => setSelectedMetric('homeless')}
        >
          Homeless People
        </button>
      </div>

      <CustomMap
        geoData={transformedData}
        selectedMetric={selectedMetric}
        filters={{}}
        valueFormatter={populationFormatter}
        metricConfig={{
          type: "count",
          unit: "people",
          label: selectedMetric === 'affectedPeople' ? 'Affected Population' : 
                 selectedMetric === 'displaced' ? 'Displaced People' : 'Homeless People'
        }}
        calculateColorRanges={(values) => {
          // Use different color schemes for different metrics
          const colorSchemes = {
            affectedPeople: ["rgba(255, 245, 157, 0.9)", "rgba(255, 193, 7, 0.9)", "rgba(255, 152, 0, 0.9)", "rgba(255, 87, 34, 0.9)", "rgba(183, 28, 28, 0.9)"],
            displaced: ["rgba(227, 242, 253, 0.9)", "rgba(144, 202, 249, 0.9)", "rgba(66, 165, 245, 0.9)", "rgba(30, 136, 229, 0.9)", "rgba(21, 101, 192, 0.9)"],
            homeless: ["rgba(240, 224, 224, 0.9)", "rgba(229, 175, 175, 0.9)", "rgba(205, 133, 133, 0.9)", "rgba(183, 110, 110, 0.9)", "rgba(139, 69, 19, 0.9)"]
          };
          
          const colors = colorSchemes[selectedMetric];
          const max = Math.max(...values);
          
          return colors.map((color, index) => ({
            min: index === 0 ? 0.1 : max * (index * 0.2),
            max: max * ((index + 1) * 0.2),
            color,
            label: `Range ${index + 1}`
          }));
        }}
      />
    </div>
  );
}
```

### Pattern 3: Disaster Events Count Mapping

```typescript
function DisasterEventsMap({ eventsData }) {
  const transformedData = useMemo(() => ({
    type: "FeatureCollection",
    features: eventsData.map(item => ({
      type: "Feature", 
      geometry: item.boundary_geojson,
      properties: {
        id: item.location_id,
        name: item.location_name,
        level: 1,
        parentId: null,
        values: {
          numberOfEvents: item.event_count || 0,
          totalSeverity: item.total_severity_score || 0,
          lastEventDate: item.last_event_date,
          dataAvailability: item.event_count > 0 ? 'available' : 'no_data',
          metadata: {
            assessmentType: "rapid",
            confidenceLevel: item.data_quality || "medium",
            lastUpdated: item.last_updated
          }
        }
      }
    }))
  }), [eventsData]);

  const eventsFormatter = useCallback((value: number) => {
    if (value === 0) return "No events recorded";
    if (value === 1) return "1 event";
    return `${value.toLocaleString()} events`;
  }, []);

  return (
    <CustomMap
      geoData={transformedData}
      selectedMetric="numberOfEvents"
      filters={{}}
      valueFormatter={eventsFormatter}
      metricConfig={{
        type: "count",
        unit: "events",
        label: "Number of Disaster Events"
      }}
      calculateColorRanges={(values) => {
        const max = Math.max(...values);
        const ranges = [];
        
        // Create ranges based on event frequency
        if (max >= 10) {
          ranges.push({ min: 10, max: max, color: "rgba(183, 28, 28, 0.9)", label: "10+ events" });
        }
        if (max >= 5) {
          ranges.push({ min: 5, max: 9, color: "rgba(211, 47, 47, 0.9)", label: "5-9 events" });
        }
        if (max >= 3) {
          ranges.push({ min: 3, max: 4, color: "rgba(244, 67, 54, 0.9)", label: "3-4 events" });
        }
        if (max >= 2) {
          ranges.push({ min: 2, max: 2, color: "rgba(255, 87, 34, 0.9)", label: "2 events" });
        }
        if (max >= 1) {
          ranges.push({ min: 1, max: 1, color: "rgba(255, 152, 0, 0.9)", label: "1 event" });
        }
        
        return ranges;
      }}
    />
  );
}
```

### Pattern 4: Mixed Metrics Dashboard

```typescript
function ComprehensiveImpactMap({ impactData }) {
  const [selectedMetric, setSelectedMetric] = useState("totalDamage");
  
  const transformedData = useMemo(() => ({
    type: "FeatureCollection",
    features: impactData.map(item => ({
      type: "Feature",
      geometry: item.geojson,
      properties: {
        id: item.region_id,
        name: item.region_name, 
        level: 1,
        parentId: null,
        values: {
          // Monetary metrics
          totalDamage: item.economic_damage || 0,
          totalLoss: item.economic_losses || 0,
          
          // Human impact metrics
          deaths: item.fatalities || 0,
          injured: item.injuries || 0,
          affectedPeople: item.affected_population || 0,
          displaced: item.displaced_population || 0,
          
          // Event metrics
          numberOfEvents: item.disaster_events_count || 0,
          
          dataAvailability: (item.economic_damage || item.fatalities || item.affected_population) > 0 ? 'available' : 'no_data'
        }
      }
    }))
  }), [impactData]);

  const metricConfigs = {
    totalDamage: {
      type: "monetary" as const,
      label: "Economic Damage",
      currency: "USD",
      colors: ["rgba(227, 242, 253, 0.9)", "rgba(144, 202, 249, 0.9)", "rgba(66, 165, 245, 0.9)", "rgba(30, 136, 229, 0.9)", "rgba(21, 101, 192, 0.9)"]
    },
    deaths: {
      type: "count" as const,
      label: "Fatalities",
      unit: "people",
      colors: ["rgba(255, 235, 238, 0.9)", "rgba(255, 205, 210, 0.9)", "rgba(239, 154, 154, 0.9)", "rgba(229, 115, 115, 0.9)", "rgba(183, 28, 28, 0.9)"]
    },
    affectedPeople: {
      type: "count" as const,
      label: "Affected Population",
      unit: "people", 
      colors: ["rgba(255, 245, 157, 0.9)", "rgba(255, 224, 130, 0.9)", "rgba(255, 193, 7, 0.9)", "rgba(255, 152, 0, 0.9)", "rgba(255, 111, 0, 0.9)"]
    },
    numberOfEvents: {
      type: "count" as const,
      label: "Number of Events",
      unit: "events",
      colors: ["rgba(243, 229, 245, 0.9)", "rgba(206, 147, 216, 0.9)", "rgba(186, 104, 200, 0.9)", "rgba(156, 39, 176, 0.9)", "rgba(106, 27, 154, 0.9)"]
    }
  };

  const currentConfig = metricConfigs[selectedMetric];

  const formatValue = useCallback((value: number, metric: string) => {
    const config = metricConfigs[metric];
    
    if (value === 0) return "No impact reported";
    
    if (config.type === "monetary") {
      return formatCurrencyWithCode(value, config.currency, {
        notation: value >= 1_000_000 ? "compact" : "standard"
      });
    }
    
    if (config.type === "count") {
      const formatted = value >= 1_000_000 ? `${(value/1_000_000).toFixed(1)}M` :
                      value >= 1_000 ? `${(value/1_000).toFixed(1)}K` :
                      value.toLocaleString();
      
      return `${formatted} ${config.unit}`;
    }
    
    return value.toString();
  }, []);

  return (
    <div className="comprehensive-impact-map">
      <div className="metric-selector-grid">
        {Object.entries(metricConfigs).map(([key, config]) => (
          <button
            key={key}
            className={`metric-button ${selectedMetric === key ? 'active' : ''}`}
            onClick={() => setSelectedMetric(key)}
          >
            <span className="metric-label">{config.label}</span>
            <span className="metric-unit">{config.type === "monetary" ? config.currency : config.unit}</span>
          </button>
        ))}
      </div>

      <CustomMap
        geoData={transformedData}
        selectedMetric={selectedMetric}
        filters={{}}
        valueFormatter={formatValue}
        currency={currentConfig.type === "monetary" ? currentConfig.currency : undefined}
        metricConfig={currentConfig}
        calculateColorRanges={(values) => {
          const max = Math.max(...values);
          return currentConfig.colors.map((color, index) => ({
            min: index === 0 ? 0.1 : max * (index * 0.2),
            max: max * ((index + 1) * 0.2),
            color,
            label: `Level ${index + 1}`
          }));
        }}
      />
    </div>
  );
}
```

```typescript
function ApiIntegration({ filters }) {
  const { data: geoData, isLoading } = useQuery({
    queryKey: ["geographic-impacts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const response = await fetch(`/api/geographic-impacts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    }
  });

  if (isLoading) return <div>Loading map...</div>;

  return (
    <ErrorBoundary>
      <CustomMap
        geoData={geoData}
        selectedMetric="totalDamage"
        filters={filters}
        currency="USD"
      />
    </ErrorBoundary>
  );
}
```

### Pattern 3: Multi-Metric Switching

```typescript
function MultiMetricMap({ data }) {
  const [selectedMetric, setSelectedMetric] = useState<"totalDamage" | "totalLoss">("totalDamage");
  
  const geoData = transformDataForMap(data);

  return (
    <div>
      <div className="metric-toggle">
        <button 
          className={`metric-btn ${selectedMetric === 'totalDamage' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('totalDamage')}
        >
          Total Damages
        </button>
        <button 
          className={`metric-btn ${selectedMetric === 'totalLoss' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('totalLoss')}
        >
          Total Losses
        </button>
      </div>
      
      <CustomMap
        geoData={geoData}
        selectedMetric={selectedMetric}
        filters={{}}
        currency="USD"
      />
    </div>
  );
}
```

### Pattern 4: Custom Color Ranges

```typescript
function CustomColorMap({ data }) {
  const customColorRanges = useCallback((values: number[], currency: string) => {
    const max = Math.max(...values);
    return [
      {
        min: max * 0.8,
        max: max,
        color: "rgba(139, 0, 0, 0.9)",
        label: "Very High Impact"
      },
      {
        min: max * 0.6,
        max: max * 0.8,
        color: "rgba(255, 69, 0, 0.9)",
        label: "High Impact"
      },
      {
        min: max * 0.4,
        max: max * 0.6,
        color: "rgba(255, 165, 0, 0.9)",
        label: "Medium Impact"
      },
      {
        min: 0.1,
        max: max * 0.4,
        color: "rgba(255, 255, 0, 0.9)",
        label: "Low Impact"
      }
    ];
  }, []);

  return (
    <CustomMap
      geoData={transformedData}
      selectedMetric="totalDamage"
      filters={{}}
      currency="USD"
      calculateColorRanges={customColorRanges}
    />
  );
}
```

## Data Transformation Helpers

### Basic Transformation for Multiple Metrics

```typescript
interface TransformOptions {
  // Monetary fields
  damageKey?: string;
  lossKey?: string;
  
  // Count fields  
  deathsKey?: string;
  injuredKey?: string;
  affectedKey?: string;
  displacedKey?: string;
  homelessKey?: string;
  eventsKey?: string;
  
  // Standard fields
  geometryKey?: string;
  idKey?: string;
  nameKey?: string;
  levelKey?: string;
  parentIdKey?: string;
}

function transformToExtendedGeoData(
  rawData: any[], 
  options: TransformOptions = {}
): GeoData {
  const {
    damageKey = 'damage',
    lossKey = 'loss',
    deathsKey = 'deaths',
    injuredKey = 'injured', 
    affectedKey = 'affected',
    displacedKey = 'displaced',
    homelessKey = 'homeless',
    eventsKey = 'events',
    geometryKey = 'geometry',
    idKey = 'id',
    nameKey = 'name',
    levelKey = 'level',
    parentIdKey = 'parentId'
  } = options;

  return {
    type: "FeatureCollection",
    features: rawData.map(item => ({
      type: "Feature",
      geometry: item[geometryKey],
      properties: {
        id: item[idKey],
        name: item[nameKey],
        level: item[levelKey] || 1,
        parentId: item[parentIdKey] || null,
        values: {
          // Monetary metrics
          totalDamage: item[damageKey] || 0,
          totalLoss: item[lossKey] || 0,
          
          // Human impact metrics
          deaths: item[deathsKey] || 0,
          injured: item[injuredKey] || 0,
          affectedPeople: item[affectedKey] || 0,
          displaced: item[displacedKey] || 0,
          homeless: item[homelessKey] || 0,
          
          // Event metrics
          numberOfEvents: item[eventsKey] || 0,
          
          // Determine data availability
          dataAvailability: (
            item[damageKey] || 
            item[lossKey] || 
            item[deathsKey] || 
            item[affectedKey] || 
            item[eventsKey]
          ) ? 'available' : 'no_data',
          
          metadata: {
            assessmentType: item.assessmentType || "rapid",
            confidenceLevel: item.confidenceLevel || "medium",
            lastUpdated: item.lastUpdated
          }
        }
      }
    }))
  };
}
```

### Value Formatting Functions

```typescript
// Comprehensive value formatter that handles all metric types
function createValueFormatter(metricConfigs: Record<string, MetricConfig>) {
  return (value: number, metric: string): string => {
    const config = metricConfigs[metric];
    
    if (value === 0) {
      const zeroLabels = {
        monetary: "No economic impact",
        count: `No ${config?.unit || "items"}`,
        percentage: "0%"
      };
      return zeroLabels[config?.type] || "No data";
    }

    switch (config?.type) {
      case "monetary":
        return formatCurrencyWithCode(value, config.currency || "USD", {
          notation: value >= 1_000_000 ? "compact" : "standard",
          ...config.formatOptions
        });
        
      case "count":
        const formatCount = (num: number) => {
          if (num >= 1_000_000_000) return `${(num/1_000_000_000).toFixed(1)}B`;
          if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
          if (num >= 1_000) return `${(num/1_000).toFixed(1)}K`;
          return num.toLocaleString();
        };
        
        const formattedNumber = formatCount(value);
        return `${formattedNumber} ${config.unit || ""}`.trim();
        
      case "percentage":
        return `${value.toFixed(config.formatOptions?.maximumFractionDigits || 1)}%`;
        
      default:
        return value.toLocaleString();
    }
  };
}

// Specific formatters for common use cases
const formatters = {
  deaths: (value: number) => {
    if (value === 0) return "No casualties reported";
    if (value === 1) return "1 casualty";
    return `${value.toLocaleString()} casualties`;
  },
  
  affectedPeople: (value: number) => {
    if (value === 0) return "No affected population";
    const format = (num: number) => {
      if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
      if (num >= 1_000) return `${(num/1_000).toFixed(1)}K`;
      return num.toLocaleString();
    };
    return `${format(value)} people affected`;
  },
  
  numberOfEvents: (value: number) => {
    if (value === 0) return "No events recorded";
    if (value === 1) return "1 event";
    return `${value} events`;
  },
  
  percentage: (value: number) => `${value.toFixed(1)}%`
};
```
```

### Specialized Transformers

```typescript
// For disaster event data
function transformDisasterEvents(events: any[]): GeoData {
  return {
    type: "FeatureCollection",
    features: events.map(event => ({
      type: "Feature",
      geometry: event.affected_area_geojson,
      properties: {
        id: event.event_id,
        name: event.event_name || event.affected_region,
        level: 1,
        parentId: null,
        values: {
          deaths: event.casualties?.deaths || 0,
          injured: event.casualties?.injured || 0,
          missing: event.casualties?.missing || 0,
          affectedPeople: event.impact?.affected_population || 0,
          displaced: event.impact?.displaced || 0,
          homeless: event.impact?.homeless || 0,
          numberOfEvents: 1, // Each feature represents one event
          
          // Economic impacts if available
          totalDamage: event.economic?.damage_estimate || 0,
          totalLoss: event.economic?.loss_estimate || 0,
          
          dataAvailability: event.has_impact_data ? 'available' : 'no_data',
          metadata: {
            assessmentType: event.assessment_type,
            confidenceLevel: event.data_confidence,
            lastUpdated: event.updated_at,
            eventDate: event.event_date,
            hazardType: event.hazard_type
          }
        }
      }
    }))
  };
}

// For population-centric data
function transformPopulationImpacts(populations: any[]): GeoData {
  return {
    type: "FeatureCollection",
    features: populations.map(pop => ({
      type: "Feature",
      geometry: pop.admin_boundary,
      properties: {
        id: pop.admin_id,
        name: pop.admin_name,
        level: pop.admin_level,
        parentId: pop.parent_admin_id,
        values: {
          affectedPeople: pop.affected_count || 0,
          displaced: pop.displaced_count || 0,
          homeless: pop.homeless_count || 0,
          evacuated: pop.evacuated_count || 0,
          
          // Demographics breakdowns
          affectedChildren: pop.affected_children || 0,
          affectedElderly: pop.affected_elderly || 0,
          affectedWomen: pop.affected_women || 0,
          
          // Baseline population for percentage calculations
          totalPopulation: pop.total_population || 0,
          
          dataAvailability: pop.has_population_data ? 'available' : 'no_data',
          metadata: {
            assessmentType: pop.assessment_method,
            confidenceLevel: pop.data_quality,
            lastUpdated: pop.last_survey_date,
            dataSource: pop.data_source
          }
        }
      }
    }))
  };
}

// For health impact data
function transformHealthImpacts(healthData: any[]): GeoData {
  return {
    type: "FeatureCollection", 
    features: healthData.map(health => ({
      type: "Feature",
      geometry: health.health_zone_boundary,
      properties: {
        id: health.zone_id,
        name: health.zone_name,
        level: health.admin_level,
        parentId: health.parent_zone_id,
        values: {
          deaths: health.mortality?.total || 0,
          injured: health.morbidity?.total_injured || 0,
          hospitalized: health.morbidity?.hospitalized || 0,
          
          // Disease outbreaks
          diseaseOutbreaks: health.outbreaks?.count || 0,
          affectedByDisease: health.outbreaks?.affected_population || 0,
          
          // Health facility impacts
          healthFacilitiesDamaged: health.infrastructure?.facilities_damaged || 0,
          healthFacilitiesDestroyed: health.infrastructure?.facilities_destroyed || 0,
          
          dataAvailability: health.has_health_data ? 'available' : 'no_data',
          metadata: {
            assessmentType: "detailed", // Health data usually requires detailed assessment
            confidenceLevel: health.data_reliability,
            lastUpdated: health.report_date,
            reportingOrg: health.reporting_organization
          }
        }
      }
    }))
  };
}
```dKey],
        name: item[options.nameKey],
        level: 1,
        parentId: null,
        values: {
          totalDamage: item.damage || 0,
          totalLoss: item.loss || 0,
          dataAvailability: (item.damage || item.loss) ? 'available' : 'no_data'
        }
      }
    }))
  };
}
```

### Advanced Transformation with Metadata

```typescript
function transformWithMetadata(rawData: any[]): GeoData {
  return {
    type: "FeatureCollection",
    features: rawData.map(item => ({
      type: "Feature",
      geometry: item.geometry,
      properties: {
        id: item.id,
        name: item.name,
        level: item.admin_level || 1,
        parentId: item.parent_id || null,
        values: {
          totalDamage: item.damage_estimate || 0,
          totalLoss: item.loss_estimate || 0,
          metadata: {
            assessmentType: item.assessment_type || "rapid",
            confidenceLevel: item.confidence || "medium"
          },
          dataAvailability: item.has_data ? 'available' : 'no_data'
        }
      }
    }))
  };
}
```

## Styling and Customization

### CSS Requirements

The component requires the ImpactMap.css file. Key classes:

```css
.impact-map-container {
  position: relative;
  width: 100%;
  height: 450px;
}

.map-tooltip {
  position: absolute;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  pointer-events: none;
  z-index: 1002;
  min-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: none;
}

.legend {
  position: absolute;
  bottom: 25px;
  right: 10px;
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

### Custom Height

```typescript
function CustomSizedMap({ data }) {
  return (
    <div style={{ height: '600px' }}>
      <CustomMap
        geoData={data}
        selectedMetric="totalDamage"
        filters={{}}
        currency="USD"
      />
    </div>
  );
}
```

## Error Handling

### Basic Error Boundary

```typescript
function SafeMap({ data }) {
  return (
    <ErrorBoundary fallback={<MapErrorFallback />}>
      <CustomMap
        geoData={data}
        selectedMetric="totalDamage"
        filters={{}}
        currency="USD"
      />
    </ErrorBoundary>
  );
}

function MapErrorFallback() {
  return (
    <div className="map-error">
      <svg>...</svg>
      <div>
        <h3>Could not load map</h3>
        <p>Please check your data or try refreshing the page.</p>
      </div>
    </div>
  );
}
```

### Data Validation

```typescript
import { z } from 'zod';

const GeoDataSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.object({
    type: z.literal("Feature"),
    geometry: z.any(),
    properties: z.object({
      id: z.number(),
      name: z.string(),
      level: z.number(),
      parentId: z.number().nullable(),
      values: z.object({
        totalDamage: z.number(),
        totalLoss: z.number(),
        dataAvailability: z.enum(["available", "no_data"])
      })
    })
  }))
});

function ValidatedMap({ data }) {
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const validatedData = useMemo(() => {
    try {
      return GeoDataSchema.parse(data);
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : 'Invalid data format');
      return null;
    }
  }, [data]);

  if (validationError) {
    return <div>Data validation error: {validationError}</div>;
  }

  if (!validatedData) {
    return <div>Loading...</div>;
  }

  return <CustomMap geoData={validatedData} {...otherProps} />;
}
```

## Performance Optimization

### Memoization

```typescript
function OptimizedMap({ rawData, filters }) {
  const geoData = useMemo(() => 
    transformToGeoData(rawData), 
    [rawData]
  );
  
  const debouncedFilters = useDebounce(filters, 300);
  
  return (
    <CustomMap
      geoData={geoData}
      selectedMetric="totalDamage"
      filters={debouncedFilters}
      currency="USD"
    />
  );
}
```

### Large Dataset Handling

```typescript
function LargeDatasetMap({ data }) {
  const [processedData, setProcessedData] = useState(null);
  
  useEffect(() => {
    // Process data in chunks or web worker for large datasets
    const processLargeDataset = async () => {
      const chunks = chunkArray(data, 100);
      const processed = await Promise.all(
        chunks.map(chunk => transformToGeoData(chunk))
      );
      
      setProcessedData({
        type: "FeatureCollection",
        features: processed.flatMap(p => p.features)
      });
    };
    
    processLargeDataset();
  }, [data]);

  if (!processedData) return <div>Processing data...</div>;

  return <CustomMap geoData={processedData} {...otherProps} />;
}
```

## Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { mockGeoData } from './fixtures';

describe('CustomMap Integration', () => {
  it('renders map with valid data', () => {
    render(
      <CustomMap
        geoData={mockGeoData}
        selectedMetric="totalDamage"
        filters={{}}
        currency="USD"
      />
    );
    
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyData = { type: "FeatureCollection", features: [] };
    
    render(
      <CustomMap
        geoData={emptyData}
        selectedMetric="totalDamage"
        filters={{}}
        currency="USD"
      />
    );
    
    expect(screen.getByText(/no geographic data available/i)).toBeInTheDocument();
  });
});
```

### Test Fixtures

```typescript
export const mockGeoData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[-74, 40], [-73, 40], [-73, 41], [-74, 41], [-74, 40]]]
      },
      properties: {
        id: 1,
        name: "Test Region",
        level: 1,
        parentId: null,
        values: {
          totalDamage: 1000000,
          totalLoss: 500000,
          dataAvailability: "available"
        }
      }
    }
  ]
};
```

## Accessibility

The component includes accessibility features:

- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader compatible tooltips
- High contrast mode support

```typescript
function AccessibleMap({ data }) {
  return (
    <div role="application" aria-label="Impact visualization map">
      <CustomMap
        geoData={data}
        selectedMetric="totalDamage"
        filters={{}}
        currency="USD"
      />
    </div>
  );
}
```

## Common Issues and Solutions

### Issue: Map doesn't render
**Solution**: Ensure the container has explicit height and the CSS is imported.

### Issue: Tooltips not showing on mobile
**Solution**: The component includes touch support. Ensure you're not blocking pointer events.

### Issue: Colors not displaying correctly
**Solution**: Check that your data includes valid numeric values and proper dataAvailability flags.

### Issue: Legend shows empty ranges
**Solution**: The component filters out empty ranges automatically. This usually indicates data issues.

### Issue: Poor performance with large datasets
**Solution**: Implement data chunking or consider server-side filtering to reduce payload size.

## Migration from Legacy Components

If migrating from an existing map component:

1. **Replace the component import**:
   ```typescript
   // Old
   import ImpactMap from "./ImpactMap";
   
   // New
   import CustomMap from "~/components/CustomMap";
   ```

2. **Update prop structure**:
   ```typescript
   // Old props structure
   <ImpactMap data={rawData} metric="damage" />
   
   // New props structure
   <CustomMap 
     geoData={transformedData} 
     selectedMetric="totalDamage"
     filters={{}}
     currency="USD"
   />
   ```

3. **Transform your data**:
   Use the transformation helpers provided in this guide.

4. **Update styling**:
   Import the required CSS file and update any custom styles.

## Support and Contributing

For issues or feature requests related to the CustomMap component, please:

1. Check the existing documentation
2. Review the component source code in `app/components/CustomMap.tsx`
3. Test with the provided examples
4. Create detailed bug reports with sample data

The component follows OpenLayers best practices and React patterns for maintainability and extensibility.