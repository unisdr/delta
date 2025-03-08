# Dashboard Visualization Requirements

## Overview

This document outlines the specific conditions that must be fulfilled to retrieve data and display visualizations for each section of the Sectors Analysis Dashboard. Understanding these requirements is essential for both developers and users to ensure proper data retrieval and visualization functionality.

## Common Requirements Across All Sections

All dashboard sections share the following base requirements:

1. **Authentication**: User must be authenticated with appropriate permissions
2. **Data Availability**: At least one disaster record must exist in the database
3. **Approval Status**: Only disaster records with `approvalStatus` set to `'published'` will be included
4. **Data Integrity**: Records must have valid relationships between tables (disaster records, sectors, events)

## Section-Specific Requirements

### 1. Impact on Selected Sector

#### Data Retrieval Conditions
- **Primary Requirement**: Valid `sectorId` must be provided (numeric format)
- **Secondary Requirements**:
  - At least one disaster record must be associated with the selected sector
  - The sector must exist in the `sectorTable`
  - For subsector analysis, parent-child relationships must be correctly defined
  - Disaster records must have `approvalStatus` set to `'published'`
  - Records must have valid relationships between tables (disaster records, sectors, events)

#### Visualization Components
- **Events Counter**: Displays total count of events impacting the sector
- **Events Timeline**: Area chart showing distribution of events over time
- **Damage Analysis**: Total monetary damage with time series visualization
- **Loss Analysis**: Total financial losses with time series visualization
- **FAO Agricultural Impact**: Specialized agricultural impact metrics (crops, livestock, fisheries, forestry)

#### International Standards Compliance
- **Sendai Framework**: Implements Target C (economic loss) calculation methodology
- **UNDRR Technical Guidance**: Follows Section B methodology for economic loss assessment
- **World Bank DaLA**: Implements damage calculation as replacement cost and loss calculation including flow disruptions

#### Filter Dependencies
- **Date Range**: Valid `startDate` and `endDate` required for temporal filtering
- **Geographic Level**: Valid division ID required for spatial filtering with PostGIS
- **Hazard Type Hierarchy**: Supports cascading filters from type → cluster → specific hazard
- **Disaster Event**: Supports filtering by specific disaster event UUID or text search
- **Assessment Type**: Supports 'rapid' or 'detailed' assessment types
- **Confidence Level**: Supports 'low', 'medium', or 'high' confidence levels

#### Code Implementation (ImpactonSectors.ts)
```typescript
// Sector ID validation is required
const numericSectorId = validateSectorId(sectorId);

// Get all subsectors if this is a parent sector
const subsectors = await getSectorsByParentId(numericSectorId);

// Return all sector IDs (parent + subsectors if any)
const sectorIds = subsectors.length > 0
  ? [sectorId, ...subsectors.map(s => s.id.toString())]
  : [sectorId];

// Apply filters including disaster event filtering
const whereConditions = [];

// Apply approval status filter
whereConditions.push(sql`${disasterRecordsTable.approvalStatus} ILIKE 'published'`);

// Apply disaster event filter if provided
if (filters?.disasterEvent) {
  try {
    // Handle UUID format for direct matching
    if (isUUID(filters.disasterEvent)) {
      whereConditions.push(eq(disasterEventTable.id, filters.disasterEvent));
    } else {
      // Handle text search across multiple fields
      whereConditions.push(
        or(
          ilike(disasterEventTable.name, `%${filters.disasterEvent}%`),
          ilike(disasterEventTable.description, `%${filters.disasterEvent}%`)
        )
      );
    }
  } catch (error) {
    console.error('Error processing disaster event filter:', error);
  }
}

// Data must exist for visualization
if (recordIds.length === 0) {
  return {
    eventCount: 0,
    totalDamage: "0",
    totalLoss: "0",
    eventsOverTime: {},
    damageOverTime: {},
    lossOverTime: {},
    metadata: createAssessmentMetadata(
      filters?.assessmentType || 'rapid',
      filters?.confidenceLevel || 'medium'
    )
  };
}
```

### 2. Impact by Hazard Type
**Status**: Published

#### Data Retrieval Conditions
- **Primary Requirement**: Valid `sectorId` must be provided
- **Secondary Requirements**:
  - At least one hazard type must be defined in the system
  - Hazard records must have valid `hipTypeId`, `hipClusterId`, or `hipHazardId`
  - Records must have proper relationships between hazardous events and disaster records
  - Records must have 'published' approval status

#### Visualization Components
- **Events Count Chart**: Pie chart showing distribution of disaster events by hazard type
- **Damages Chart**: Pie chart showing distribution of damages by hazard type
- **Losses Chart**: Pie chart showing distribution of losses by hazard type
- Each chart includes:
  - Interactive segments with hover effects
  - Percentage and absolute value tooltips
  - Color-coded legend with UNDRR standard colors
  - Responsive layout for different screen sizes

#### International Standards Compliance
- **Sendai Framework**: Aligns with Priority 1 (Understanding disaster risk) and Priority 4 (Enhancing disaster preparedness)
- **UNDRR Technical Guidance**: Follows hazard classification system and visualization standards
- **World Bank DaLA**: Conforms to Damage and Loss Assessment methodology for economic impact calculation

#### Filter Dependencies
- **Hazard Type Hierarchy**: Filters cascade from type → cluster → specific hazard
- **Geographic Level**: Valid division ID required for spatial filtering with PostGIS integration
- **Date Range**: Valid `fromDate` and `toDate` required for temporal filtering
- **Disaster Event**: Supports filtering by specific disaster event ID
- **Sector Hierarchy**: Supports both sector and subsector level analysis

#### Code Implementation (hazardImpact.ts)
```typescript
// Base conditions including approval status
const baseConditions = [
  sql`${disasterRecordsTable.approvalStatus} ILIKE 'published'`
];

// Get all sector IDs (including subsectors)
const sectorIds = sectorId ? await getAllSubsectorIds(sectorId) : [];

// Handle sector filtering using proper hierarchy
if (sectorId && sectorIds.length > 0) {
  // Add condition for sectorDisasterRecordsRelation
  baseConditions.push(
    exists(
      dr.select()
        .from(sectorDisasterRecordsRelationTable)
        .where(and(
          eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
          inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
        ))
    )
  );
}

// Add hazard type filters if provided
if (hazardTypeId) {
  baseConditions.push(eq(hazardousEventTable.hipTypeId, hazardTypeId));
}
if (hazardClusterId) {
  baseConditions.push(eq(hazardousEventTable.hipClusterId, hazardClusterId));
}
if (specificHazardId) {
  baseConditions.push(eq(hazardousEventTable.hipHazardId, specificHazardId));
}

// Add disaster event filter if provided
if (disasterEventId) {
  try {
    const eventId = _disasterEventId || disasterEventId;
    baseConditions.push(eq(disasterRecordsTable.disasterEventId, eventId));
  } catch (error) {
    console.error("Invalid disaster event ID format:", error);
    // Return empty results on error
  }
}

// Add geographic level filter with spatial query
if (geographicLevelId) {
  const divisionInfo = await getDivisionInfo(geographicLevelId);
  if (divisionInfo?.geometry) {
    // Spatial matching using PostGIS for geographic filtering
    baseConditions.push(sql`
      ST_Intersects(
        CASE 
          WHEN ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326)) 
          THEN ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326)
          ELSE NULL 
        END,
        ${divisionInfo.geometry}
      )
    `);
  }
}
```

#### Frontend Implementation
The visualization uses React with Recharts library to create interactive pie charts:
- Responsive container ensures proper rendering on all devices
- Custom tooltips display both percentage and absolute values
- Animation effects enhance user experience
- Proper error handling and loading states
- Hierarchical sector title display (shows subsector and parent sector when applicable)

#### Data Processing
- Filters out zero/null values for cleaner visualization
- Calculates percentages for each hazard type's contribution
- Formats currency values according to locale settings
- Supports special agricultural subsector calculations for FAO compliance

### 3. Impact by Geographic Location

#### Data Retrieval Conditions
- **Primary Requirements**: 
  - Valid geographic data must be available in the database
  - PostGIS spatial functions must be operational for geographic queries
- **Secondary Requirements**:
  - Division geometries must be properly defined in the database with valid GeoJSON
  - Disaster records must have valid `spatialFootprint` data or be associated with geographic divisions
  - Proper parent-child relationships between geographic divisions must be maintained

#### Visualization Components
- **Interactive Map**: OpenLayers-based visualization with drill-down capability
- **Choropleth Representation**: Color-coded divisions based on damage/loss values
- **Hierarchical Navigation**: Support for navigating from national to provincial to municipal levels
- **Dynamic Tooltips**: Contextual information displayed on hover with formatted currency values
- **Legend**: Dynamic color scale with appropriate ranges based on data distribution

#### Filter Dependencies
- **Sector Filter**: Filters impact data by sector ID and optional sub-sector ID
- **Hazard Filter**: Hierarchical filtering by hazard type, hazard cluster, and specific hazard
- **Date Range**: Temporal filtering of disaster events by date range
- **Disaster Event**: Filtering by specific disaster event ID with UUID validation
- **Assessment Type**: Optional filtering by assessment methodology (rapid/detailed)
- **Confidence Level**: Optional filtering by data confidence level (low/medium/high)

#### Code Implementation
```typescript
// Frontend implementation with OpenLayers (ImpactMapOl.tsx)
export default function ImpactMapOl({ geoData, selectedMetric, filters }: ImpactMapProps) {
  // Fetch data with all applicable filters
  const fetchGeoData = async (level: number, parentId: number | null) => {
    const url = new URL('/api/analytics/geographic-impacts', window.location.origin);
    const params = new URLSearchParams();
    
    // Add required sector filter
    if (filters.sectorId) {
      params.set('sectorId', filters.sectorId);
    }
    
    // Add all optional filters
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
    
    // Add geographic navigation parameters
    params.set('level', level.toString());
    if (parentId !== null) {
      params.set('parentId', parentId.toString());
    }
    
    // Fetch and process GeoJSON data
    const response = await fetch(`${url.toString()}?${params.toString()}`);
    const data = await response.json();
    
    // Update map with new geographic data
    // ...
  };
  
  // Dynamic color calculation based on data distribution
  const calculateColorRanges = useMemo(() => {
    if (!geoData?.features) return [];
    
    const values = geoData.features
      .map(f => f.properties?.values?.[selectedMetric])
      .filter(v => typeof v === 'number' && v > 0);
    
    const max = Math.max(...values, 0);
    let ranges: ColorRange[] = [];
    
    if (max > 0) {
      // Create 5 color ranges based on percentages of max value
      ranges = [
        { min: max * 0.8, max: max, color: 'rgba(21, 101, 192, 0.9)', label: `${formatCurrencyWithCode(max * 0.8, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max, defaultCurrency, {}, 'thousands')}` },
        { min: max * 0.6, max: max * 0.8, color: 'rgba(30, 136, 229, 0.9)', label: `${formatCurrencyWithCode(max * 0.6, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.8, defaultCurrency, {}, 'thousands')}` },
        { min: max * 0.4, max: max * 0.6, color: 'rgba(66, 165, 245, 0.9)', label: `${formatCurrencyWithCode(max * 0.4, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.6, defaultCurrency, {}, 'thousands')}` },
        { min: max * 0.2, max: max * 0.4, color: 'rgba(144, 202, 249, 0.9)', label: `${formatCurrencyWithCode(max * 0.2, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.4, defaultCurrency, {}, 'thousands')}` },
        { min: 0.1, max: max * 0.2, color: 'rgba(227, 242, 253, 0.9)', label: `${formatCurrencyWithCode(0.1, defaultCurrency, {}, 'thousands')} - ${formatCurrencyWithCode(max * 0.2, defaultCurrency, {}, 'thousands')}` }
      ];
    }
    
    // Add special cases for zero impact and no data
    ranges.push(
      { min: 0, max: 0, color: 'rgba(255, 255, 255, 0.9)', label: "Zero Impact (Confirmed)" },
      { min: -1, max: -1, color: 'rgba(200, 200, 200, 0.9)', label: "No Data Available" }
    );
    
    return ranges;
  }, [geoData?.features, selectedMetric, defaultCurrency]);
}
```

### 4. Effect Details in Sector

#### Data Retrieval Conditions
- **Primary Requirements**: 
  - Valid `sectorId` or `subSectorId` must be provided
  - Proper access to the damages, losses, and disruptions tables
  - PostGIS spatial functions must be operational for geographic filtering
- **Secondary Requirements**:
  - Disaster records must have `approvalStatus` set to 'published'
  - Proper relationships must exist between disaster records and sectors
  - Valid joins between disaster records, events, and hazardous events

#### Visualization Components
- **Tabular Data Display**: Interactive sortable tables for damages, losses, and disruptions
- **Dynamic Currency Formatting**: Automatic scaling based on value magnitude (raw, thousands, millions)
- **Empty State Handling**: Clear messaging when no data is available for selected filters
- **Loading States**: Visual indicators during data fetching operations
- **Error Handling**: User-friendly error messages with specific error codes

#### Filter Dependencies
- **Sector Hierarchy**: Main sector and subsector relationship for proper filtering
- **Hazard Filtering**: Hierarchical filtering by hazard type, cluster, and specific hazard
- **Geographic Filtering**: Spatial filtering using PostGIS for geographic divisions
- **Temporal Filtering**: Date range filtering for disaster events
- **Disaster Event Filtering**: Direct filtering by specific disaster event ID

#### Code Implementation
```typescript
// Frontend implementation (EffectDetails.tsx)
export function EffectDetails({ filters, currency }: Props) {
  // Debounce filters to prevent excessive API calls
  const debouncedFilters = useDebounce(filters, 500);
  
  // Fetch effect details data with proper error handling
  const { data: effectDetailsResponse, isLoading, error } = useQuery<EffectDetailsResponse>({
    queryKey: ["effectDetails", debouncedFilters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      // Handle sector/subsector relationship correctly
      if (debouncedFilters.subSectorId) {
        searchParams.append('sectorId', debouncedFilters.subSectorId);
      } else if (debouncedFilters.sectorId) {
        searchParams.append('sectorId', debouncedFilters.sectorId);
      }
      
      // Add all other filter parameters
      Object.entries(debouncedFilters).forEach(([key, value]) => {
        if (value && key !== 'sectorId' && key !== 'subSectorId') {
          searchParams.append(key, value);
        }
      });
      
      const response = await fetch(`/api/analytics/effect-details?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch effect details: ${response.statusText}`);
      }
      return response.json();
    },
    // Only enable query when at least one filter is selected
    enabled: !!(debouncedFilters.sectorId || debouncedFilters.subSectorId || 
                debouncedFilters.hazardTypeId || debouncedFilters.hazardClusterId || 
                debouncedFilters.specificHazardId || debouncedFilters.geographicLevelId || 
                debouncedFilters.fromDate || debouncedFilters.toDate || 
                debouncedFilters.disasterEventId),
  });
  
  // Render tabular data with proper formatting
  return (
    <section className="dts-page-section">
      {effectDetailsResponse && (
        <div>
          {/* Damages Table */}
          <SortableTable
            title="Damages"
            columns={[
              { key: 'assetName', label: 'Asset' },
              { key: 'totalDamageAmount', label: 'Total Damage' },
              { key: 'totalRepairReplacement', label: 'Repair/Replacement' },
              { key: 'totalRecovery', label: 'Recovery' },
            ]}
            data={effectDetailsResponse.data.damages}
            currency={currency}
          />
          
          {/* Losses Table */}
          <SortableTable
            title="Losses"
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'description', label: 'Description' },
              { key: 'publicCostTotal', label: 'Public Cost' },
              { key: 'privateCostTotal', label: 'Private Cost' },
            ]}
            data={effectDetailsResponse.data.losses}
            currency={currency}
          />
          
          {/* Disruptions Table */}
          <SortableTable
            title="Disruptions"
            columns={[
              { key: 'comment', label: 'Description' },
              { key: 'durationDays', label: 'Duration (Days)' },
              { key: 'usersAffected', label: 'Users Affected' },
              { key: 'responseCost', label: 'Response Cost' },
            ]}
            data={effectDetailsResponse.data.disruptions}
            currency={currency}
          />
        </div>
      )}
    </section>
  );
}
```

### 5. Most Damaging Events

#### Data Retrieval Conditions
- **Primary Requirements**: 
  - Valid disaster events with damage and/or loss data must exist
  - Disaster records must have `approvalStatus` set to 'published'
  - Proper relationships between disaster records, events, and hazardous events
- **Secondary Requirements**:
  - Proper sector relationships through `sectorDisasterRecordsRelationTable`
  - Valid spatial data for geographic filtering
  - Proper date information for temporal filtering

#### Visualization Components
- **Interactive Table**: Sortable columns with visual indicators for sort direction
- **Dynamic Currency Formatting**: Automatic scaling based on value magnitude (raw, thousands, millions)
- **Pagination Controls**: Navigation between pages of results with page count display
- **Empty State Handling**: Clear messaging when no data is available for selected filters
- **Loading States**: Visual indicators during data fetching operations
- **Error Handling**: User-friendly error messages when data retrieval fails

#### Filter Dependencies
- **Sector Hierarchy**: Main sector and subsector relationship for proper filtering
- **Hazard Filtering**: Hierarchical filtering by hazard type, cluster, and specific hazard
- **Geographic Filtering**: Spatial filtering using PostGIS for geographic divisions
- **Temporal Filtering**: Date range filtering with proper date parsing
- **Sorting Options**: Multiple sort columns (damages, losses, eventName, createdAt) with direction control

#### Code Implementation
```typescript
// Backend implementation (mostDamagingEvents.ts)
export async function getMostDamagingEvents(params: MostDamagingEventsParams): Promise<PaginatedResult> {
  // Cache implementation for performance
  const cacheKey = JSON.stringify(params);
  const cached = resultsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Build filter conditions with improved geographic filtering
  const { conditions, sectorIds } = await buildFilterConditions(params);
  
  // Optimize query with proper joins and filtering
  const query = db
    .select({
      eventId: disasterEventTable.id,
      eventName: disasterEventTable.nameNational,
      createdAt: disasterEventTable.createdAt,
      totalDamages: sql<number>`COALESCE(SUM(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)), 0)`,
      totalLosses: sql<number>`COALESCE(SUM(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)), 0)`
    })
    .from(disasterEventTable)
    .innerJoin(
      disasterRecordsTable,
      eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
    )
    .leftJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .leftJoin(
      damagesTable,
      and(
        eq(disasterRecordsTable.id, damagesTable.recordId),
        sectorIds ? inArray(damagesTable.sectorId, sectorIds.map(id => parseInt(id, 10))) : undefined
      )
    )
    .leftJoin(
      lossesTable,
      and(
        eq(disasterRecordsTable.id, lossesTable.recordId),
        sectorIds ? inArray(lossesTable.sectorId, sectorIds.map(id => parseInt(id, 10))) : undefined
      )
    )
    .where(and(...conditions))
    .groupBy(
      disasterEventTable.id,
      disasterEventTable.nameNational,
      disasterEventTable.createdAt
    );

  // Apply dynamic sorting based on user selection
  if (params.sortBy === 'damages') {
    query.orderBy(
      params.sortDirection === 'desc'
        ? desc(sql`COALESCE(SUM(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)), 0)`)
        : sql`COALESCE(SUM(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)), 0)`
    );
  } else if (params.sortBy === 'losses') {
    query.orderBy(
      params.sortDirection === 'desc'
        ? desc(sql`COALESCE(SUM(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)), 0)`)
        : sql`COALESCE(SUM(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)), 0)`
    );
  } else if (params.sortBy === 'eventName') {
    query.orderBy(
      params.sortDirection === 'desc'
        ? desc(disasterEventTable.nameNational)
        : disasterEventTable.nameNational
    );
  } else {
    // Default to createdAt
    query.orderBy(
      params.sortDirection === 'desc'
        ? desc(disasterEventTable.createdAt)
        : disasterEventTable.createdAt
    );
  }

  // Apply pagination
  return paginatedQuery
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
```

## User Guide

This section provides simplified explanations of the Sectors Analysis Dashboard for non-technical users and trainers.

### Dashboard Overview for Users

The Sectors Analysis Dashboard provides comprehensive disaster impact analysis across different sectors. Here's what you need to know:

- **Purpose**: Visualize and analyze disaster impacts on different sectors of the economy
- **Key Features**: Impact analysis, geographic visualization, hazard impact comparison, effect details, and most damaging events ranking
- **Data Source**: All visualizations use disaster records that have been fully approved ('published' status)

### Step-by-Step Workflows

#### 1. Analyzing Sector Impact

1. **Select a Sector**: Choose the main sector from the dropdown menu
2. **Apply Filters**: Narrow results by date range, geographic area, or hazard type
3. **Interpret Results**: View the impact metrics, including:
   - Total number of events affecting the sector
   - Total monetary damages and losses
   - Timeline of events over the selected period

#### 2. Exploring Geographic Impact

1. **Select Geographic Level**: Choose country, region, province, or municipality
2. **Apply Sector Filter**: Narrow to specific sector if desired
3. **Interpret Map**: Colors indicate impact severity; darker colors = higher impact
4. **View Details**: Click on a geographic area to see detailed impact information

#### 3. Viewing Most Damaging Events

1. **Apply Filters**: Select sector, date range, and/or hazard type
2. **Sort Results**: Click column headers to sort by damage amount, loss amount, or date
3. **Navigate Pages**: Use pagination controls if multiple pages of results exist
4. **Interpret Data**: Each row shows event name, total damages, total losses, and date

### Common Troubleshooting

- **No Data Appears**: Ensure filters aren't too restrictive; try broadening date range
- **Map Doesn't Load**: Check if geographic data exists for selected filters
- **Slow Performance**: Reduce filter complexity or narrow date ranges for faster results

## Visual Aids

_Note: The following section describes visual aids that should be added to enhance understanding._

### Data Flow Diagrams

```
[PLACEHOLDER: Add diagram showing data flow from database through API to frontend visualization]
```

### Dashboard Section Mockups

```
[PLACEHOLDER: Add annotated screenshots of each dashboard section]
```

### Filter Relationship Visualization

```
[PLACEHOLDER: Add diagram showing how filters interact and affect displayed data]
```

## Training Scenarios

### Scenario 1: Analyzing Agricultural Sector Impact

**Objective**: Determine the total economic impact on the agricultural sector from flooding events.

**Steps**:
1. Navigate to "Impact on Selected Sector"
2. Select "Agriculture" from the sector dropdown
3. Filter hazard type to "Flood"
4. Set appropriate date range (e.g., last 5 years)
5. Observe total damages and losses
6. Analyze the timeline to identify peak impact periods

**Expected Outcome**: Comprehensive view of flood impacts on agriculture over time.

### Scenario 2: Identifying Most Vulnerable Geographic Areas

**Objective**: Identify which provinces have suffered the most damage from natural disasters.

**Steps**:
1. Navigate to "Geographic Impact"
2. Select "Province" as the geographic level
3. Apply any relevant filters (sector, date range)
4. Observe the color intensity on the map
5. Click on the darkest-colored provinces to view detailed impact information

**Expected Outcome**: Visual identification of most-affected provinces with detailed impact data.

### Scenario 3: Comparing Hazard Types

**Objective**: Compare the relative impact of different hazard types on infrastructure.

**Steps**:
1. Navigate to "Hazard Impact"
2. Select "Infrastructure" from the sector dropdown
3. Apply relevant date range
4. Observe the pie charts showing event count, damages, and losses by hazard type
5. Hover over segments to see detailed values

**Expected Outcome**: Clear visualization of which hazard types cause the most significant impacts on infrastructure.

## Technical Glossary

| Term | Definition |
|------|------------|
| Approval Status | The stage of verification for disaster records. Only 'published' records appear in visualizations. |
| Damages | The monetary value of physical destruction to assets, calculated as repair or replacement costs. |
| Disaster Event | A specific occurrence of a hazardous event that has caused damage or losses. |
| Geographic Level | The administrative division level (country, region, province, municipality). |
| Hazard Cluster | A grouping of related hazard types (e.g., meteorological, geological). |
| Hazard Type | The category of natural or man-made hazard (e.g., flood, earthquake). |
| Losses | The monetary value of changes in economic flows resulting from a disaster. |
| PostGIS | A spatial database extension that allows geographic queries. |
| Sector | A segment of the economy or society (e.g., agriculture, health, education). |
| Subsector | A more specific division within a main sector. |

## Developer Reference

_Note: The following sections maintain the original technical documentation for developers._

{{ ... }}

## Data Quality Requirements

For all visualizations to display correctly, the following data quality requirements must be met:

1. **Completeness**: All required fields must be populated
2. **Consistency**: Related records must maintain referential integrity
3. **Accuracy**: Monetary values must be properly formatted and calculated
4. **Timeliness**: Date fields must be valid and within expected ranges

## Error Handling and Fallbacks

When data requirements are not met, the following fallback behaviors are implemented:

1. **Empty Data Sets**: Components display "No data available" message
2. **Invalid Filters**: Default filters are applied with user notification
3. **Calculation Errors**: Zero values are displayed with warning indicators
4. **Spatial Data Issues**: Text-based matching is used as fallback when spatial queries fail

## Conclusion

This document outlines the specific conditions required for each section of the Sectors Analysis Dashboard to retrieve data and display visualizations. By ensuring these conditions are met, developers can guarantee proper functionality and users can understand the requirements for meaningful data visualization.

For optimal dashboard performance, it is recommended to:

1. Ensure complete and accurate data entry
2. Maintain proper relationships between tables
3. Provide valid spatial data where possible
4. Complete the approval process for all disaster records
5. Validate all monetary values and calculations

