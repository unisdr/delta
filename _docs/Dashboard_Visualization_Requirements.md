# Dashboard Visualization Requirements

## Overview

This document outlines the specific conditions that must be fulfilled to retrieve data and display visualizations for each section of the Sectors Analysis Dashboard. Understanding these requirements is essential for both developers and users to ensure proper data retrieval and visualization functionality.

## Common Requirements Across All Sections

All dashboard sections share the following base requirements:

1. **Authentication**: User must be authenticated with appropriate permissions
2. **Data Availability**: At least one disaster record must exist in the database
3. **Approval Status**: Only disaster records with `approvalStatus` set to `'pusblished'` will be included
4. **Data Integrity**: Records must have valid relationships between tables (disaster records, sectors, events)

## Section-Specific Requirements

### 1. Impact on Selected Sector

#### Data Retrieval Conditions
- **Primary Requirement**: Valid `sectorId` must be provided
- **Secondary Requirements**:
  - At least one disaster record must be associated with the selected sector
  - The sector must exist in the `sectorTable`
  - For subsector analysis, parent-child relationships must be correctly defined

#### Visualization Conditions
- **Time Series Charts**: At least one event with valid date information is required
- **Damage/Loss Totals**: At least one record with valid monetary values is required
- **FAO Agricultural Impact**: Only displayed when the sector is an agricultural sector (crops, livestock, fisheries, forestry)

#### Filter Dependencies
- **Date Range**: Valid `startDate` and `endDate` required for temporal filtering
- **Geographic Level**: Valid division ID required for spatial filtering
- **Hazard Type**: Valid hazard type ID required for hazard-specific analysis

#### Code Implementation (ImpactonSectors.ts)
```typescript
// Sector ID validation is required
const numericSectorId = validateSectorId(sectorId);

// Get all subsectors if this is a parent sector
const subsectors = await getSectorsByParentId(numericSectorId);

// Disaster records must be associated with the sector
const recordIds = await getDisasterRecordsForSector(sectorId, filters);

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

#### Data Retrieval Conditions
- **Primary Requirement**: Valid `sectorId` must be provided
- **Secondary Requirements**:
  - At least one hazard type must be defined in the system
  - Hazard records must have valid `hipTypeId`, `hipClusterId`, or `hipHazardId`
  - Records must have proper relationships between hazardous events and disaster records

#### Visualization Conditions
- **Hazard Comparison Charts**: At least two different hazard types with data are required for meaningful comparison
- **Impact Metrics**: At least one record with valid damage or loss values is required
- **Hazard Distribution**: Multiple hazard types are required for distribution visualization

#### Filter Dependencies
- **Hazard Type Hierarchy**: Filters cascade from type → cluster → specific hazard
- **Geographic Level**: Valid division ID required for spatial filtering
- **Date Range**: Valid `startDate` and `endDate` required for temporal filtering

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
```

### 3. Impact by Geographic Location

#### Data Retrieval Conditions
- **Primary Requirement**: Valid `geographicLevelId` or spatial data must be available
- **Secondary Requirements**:
  - Division geometries must be properly defined in the `divisionTable`
  - Disaster records must have valid `spatialFootprint` or `locationDesc`
  - PostGIS functions must be operational for spatial queries

#### Visualization Conditions
- **Map Visualization**: Valid GeoJSON data is required for each division
- **Choropleth Maps**: At least one division with impact data is required
- **Regional Comparison**: Multiple divisions with data are required for comparison

#### Filter Dependencies
- **Division Level**: Parent-child relationships between divisions must be correctly defined
- **Sector Filter**: Valid sector ID required for sector-specific geographic analysis
- **Hazard Filter**: Valid hazard type ID required for hazard-specific geographic analysis

#### Code Implementation (geographicImpact.ts)
```typescript
// Improved geographic level filtering with PostGIS
if (filters.geographicLevelId) {
  try {
    // First, get the division geometry for the specified geographic level
    const division = await dr
      .select({
        id: divisionTable.id,
        geom: divisionTable.geom
      })
      .from(divisionTable)
      .where(eq(divisionTable.id, Number(filters.geographicLevelId)))
      .limit(1);

    if (division.length > 0) {
      // Use PostGIS for spatial filtering with proper error handling
      baseConditions.push(
        sql`(
          (${disasterRecordsTable.spatialFootprint} IS NOT NULL AND 
           jsonb_typeof(${disasterRecordsTable.spatialFootprint}) = 'object' AND
           (${disasterRecordsTable.spatialFootprint}->>'type' IS NOT NULL) AND
           ST_IsValid(
             ST_SetSRID(
               ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 
               4326
             )
           ) AND
           ST_Intersects(
             ST_SetSRID(
               ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 
               4326
             ),
             ${division[0].geom}
           )
          ) OR
          (${disasterRecordsTable.spatialFootprint}->>'division_id' = ${filters.geographicLevelId}::text)
        )`
      );
    }
  } catch (error) {
    // Fallback to text-based filtering
    baseConditions.push(
      sql`${disasterRecordsTable.spatialFootprint}->>'division_id' = ${filters.geographicLevelId}::text`
    );
  }
}
```

### 4. Effect Details in Sector

#### Data Retrieval Conditions
- **Primary Requirement**: Valid `sectorId` must be provided
- **Secondary Requirements**:
  - Damage records must have valid `assetId` and `recordId`
  - Loss records must have valid `description` and monetary values
  - Disruption records must have valid `serviceId` and duration values

#### Visualization Conditions
- **Damage Breakdown**: At least one damage record with valid asset information is required
- **Loss Analysis**: At least one loss record with valid cost information is required
- **Disruption Timeline**: At least one disruption record with valid duration is required

#### Filter Dependencies
- **Asset Types**: Valid asset types must be defined for damage categorization
- **Service Types**: Valid service types must be defined for disruption analysis
- **Date Range**: Valid `startDate` and `endDate` required for temporal filtering

#### Code Implementation (effectDetails.ts)
```typescript
// Base conditions for disaster records
const baseConditions = [
  sql`${disasterRecordsTable.approvalStatus} ILIKE 'published'`
];

// Add sector filter to disaster records if we have target sectors
if (targetSectorIds.length > 0) {
  baseConditions.push(
    exists(
      dr.select()
        .from(sectorDisasterRecordsRelationTable)
        .where(and(
          eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
          inArray(sectorDisasterRecordsRelationTable.sectorId, targetSectorIds)
        ))
    )
  );
}

// Fetch damages data with optimized joins and sector filtering
const damagesData = await dr
  .select({
    id: damagesTable.id,
    type: sql<string>`'damage'`.as("type"),
    assetName: assetTable.name,
    totalDamageAmount: sql<string>`${calculateDamages(damagesTable)}`.as("totalDamageAmount"),
    totalRepairReplacement: damagesTable.totalRepairReplacement,
    totalRecovery: damagesTable.totalRecovery,
    sectorId: damagesTable.sectorId,
    attachments: damagesTable.attachments,
    spatialFootprint: damagesTable.spatialFootprint
  })
  .from(damagesTable)
  .innerJoin(assetTable, eq(damagesTable.assetId, assetTable.id))
  .innerJoin(disasterRecordsTable, eq(damagesTable.recordId, disasterRecordsTable.id))
  .innerJoin(
    disasterEventTable,
    eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
  )
  .innerJoin(
    hazardousEventTable,
    eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
  )
  .where(and(
    ...baseConditions,
    // Add sector filter directly to damages table
    targetSectorIds.length > 0 ? inArray(damagesTable.sectorId, targetSectorIds) : undefined
  ))
  .groupBy(damagesTable.id, assetTable.name);
```

### 5. Most Damaging Events

#### Data Retrieval Conditions
- **Primary Requirement**: At least one disaster event with damage/loss data must exist
- **Secondary Requirements**:
  - Events must have valid relationships between `disasterEventTable` and `hazardousEventTable`
  - Damage and loss records must be properly linked to disaster records
  - Events must have valid date information for temporal sorting

#### Visualization Conditions
- **Event Ranking**: At least one event with damage/loss values is required
- **Comparison Table**: Multiple events are required for meaningful comparison
- **Pagination**: Sufficient events are required to demonstrate pagination functionality

#### Filter Dependencies
- **Sort Options**: Valid sort column and direction are required
- **Sector Filter**: Valid sector ID required for sector-specific event analysis
- **Date Range**: Valid `startDate` and `endDate` required for temporal filtering

#### Code Implementation (mostDamagingEvents.ts)
```typescript
// Build query with proper sorting
const query = db
  .select({
    eventId: disasterEventTable.id,
    eventName: hazardousEventTable.name,
    createdAt: disasterRecordsTable.createdAt,
    totalDamages: sql<number>`COALESCE(SUM(${calculateDamages(damagesTable)}::numeric), 0)`.as('totalDamages'),
    totalLosses: sql<number>`COALESCE(SUM(${calculateLosses(lossesTable)}::numeric), 0)`.as('totalLosses'),
    total: sql<number>`COALESCE(SUM(${calculateDamages(damagesTable)}::numeric), 0) + COALESCE(SUM(${calculateLosses(lossesTable)}::numeric), 0)`.as('total')
  })
  .from(disasterRecordsTable)
  .innerJoin(
    disasterEventTable,
    eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
  )
  .innerJoin(
    hazardousEventTable,
    eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
  )
  .leftJoin(
    damagesTable,
    eq(damagesTable.recordId, disasterRecordsTable.id)
  )
  .leftJoin(
    lossesTable,
    eq(lossesTable.recordId, disasterRecordsTable.id)
  )
  .where(and(...conditions))
  .groupBy(disasterEventTable.id, hazardousEventTable.name, disasterRecordsTable.createdAt);

// Apply sorting
switch (params.sortBy) {
  case 'damages':
    query.orderBy(params.sortDirection === 'asc' ? sql`totalDamages` : desc(sql`totalDamages`));
    break;
  case 'losses':
    query.orderBy(params.sortDirection === 'asc' ? sql`totalLosses` : desc(sql`totalLosses`));
    break;
  case 'eventName':
    query.orderBy(params.sortDirection === 'asc' ? hazardousEventTable.name : desc(hazardousEventTable.name));
    break;
  case 'createdAt':
  default:
    query.orderBy(params.sortDirection === 'asc' ? disasterRecordsTable.createdAt : desc(disasterRecordsTable.createdAt));
}
```

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
