// Applies filters to hazardous events based on hazard type, cluster, and specific hazard
// Fully respects hierarchical relationships (type ➔ cluster ➔ hazard)
// Validates filter logic and joins against disaster event and hazardous event tables

export async function applyHazardFilters(
    filters: any,
    dr: any,
    baseConditions: any[],
    sql: any,
    eq: any,
    inArray: any,
    hipTypeTable: any,
    hipClusterTable: any,
    hipHazardTable: any,
    hazardousEventTable: any,
    disasterEventTable: any,
    disasterRecordsTable: any,
    query: any,
    and: any
): Promise<any> {
    // const hazardTypeId = filters.hazardTypeId ? String(filters.hazardTypeId).trim() : null;
    // const hazardClusterId = filters.hazardClusterId ? String(filters.hazardClusterId).trim() : null;
    // const specificHazardId = filters.specificHazardId ? String(filters.specificHazardId).trim() : null;
    const hazardTypeId = filters.hazardTypeId != null ? String(filters.hazardTypeId).trim() : null;
    const hazardClusterId = filters.hazardClusterId != null ? String(filters.hazardClusterId).trim() : null;
    const specificHazardId = filters.specificHazardId != null ? String(filters.specificHazardId).trim() : null;

    console.log("🌋 [HAZARD FILTERS]:", {
        "Hazard Type ID": filters.hazardTypeId ?? "(none)",
        "Hazard Cluster ID": filters.hazardClusterId ?? "(none)",
        "Specific Hazard ID": filters.specificHazardId ?? "(none)",
    });

    const hazardFiltersExist = hazardTypeId || hazardClusterId || specificHazardId;

    // Always add the joins regardless of filters
    query = query
        .innerJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
        .innerJoin(hazardousEventTable, eq(disasterEventTable.hazardousEventId, hazardousEventTable.id));

    // If no filters exist, return the query with joins
    if (!hazardFiltersExist) {
        return query;
    }

    console.log("🔍 Hazard filter cascade initiated:", {
        hazardTypeId,
        hazardClusterId,
        specificHazardId,
    });

    // ✅ Apply WHERE filters based on hazard hierarchy
    if (hazardTypeId) {
        baseConditions.push(eq(hazardousEventTable.hipTypeId, hazardTypeId));
    }
    if (hazardClusterId) {
        baseConditions.push(eq(hazardousEventTable.hipClusterId, hazardClusterId));
    }
    if (specificHazardId) {
        baseConditions.push(eq(hazardousEventTable.hipHazardId, specificHazardId));
    }

    // ✅ Hierarchical validation (non-blocking)
    try {
        if (specificHazardId) {
            const hazardValidation = await dr
                .select({
                    hazardId: hipHazardTable.id,
                    clusterId: hipHazardTable.clusterId,
                    typeId: hipClusterTable.typeId,
                })
                .from(hipHazardTable)
                .innerJoin(hipClusterTable, eq(hipHazardTable.clusterId, hipClusterTable.id))
                .innerJoin(hipTypeTable, eq(hipClusterTable.typeId, hipTypeTable.id))
                .where(eq(hipHazardTable.id, specificHazardId))
                .limit(1);

            const record = hazardValidation[0];
            if (record) {
                if (hazardClusterId && record.clusterId !== hazardClusterId) {
                    console.warn(`⚠️ Hazard mismatch: specificHazard ${specificHazardId} ➔ cluster ${record.clusterId}, expected ${hazardClusterId}`);
                }
                if (hazardTypeId && record.typeId !== hazardTypeId) {
                    console.warn(`⚠️ Hazard mismatch: specificHazard ${specificHazardId} ➔ type ${record.typeId}, expected ${hazardTypeId}`);
                }
            }
        } else if (hazardClusterId && hazardTypeId) {
            const clusterValidation = await dr
                .select({
                    clusterId: hipClusterTable.id,
                    typeId: hipClusterTable.typeId,
                })
                .from(hipClusterTable)
                .where(eq(hipClusterTable.id, hazardClusterId))
                .limit(1);

            const record = clusterValidation[0];
            if (record && record.typeId !== hazardTypeId) {
                console.warn(`⚠️ Cluster mismatch: cluster ${hazardClusterId} ➔ type ${record.typeId}, expected ${hazardTypeId}`);
            }
        }
    } catch (error) {
        console.error("🔥 Error during hazard hierarchy validation:", error);
    }

    console.log("✅ Hazard filters applied to baseConditions.");

    return query;
}
