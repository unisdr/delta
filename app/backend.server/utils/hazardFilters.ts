// Applies filters to hazardous events based on hazard type, cluster, and specific hazard
// Fully respects hierarchical relationships (type ➔ cluster ➔ hazard)
// Validates filter logic and joins against disaster event and hazardous event tables

import createLogger from "~/utils/logger.server";

// Create logger for this utility module
const logger = createLogger("backend.server/utils/hazardFilters");

export async function applyHazardFilters(
    filters: any,
    dr: any,
    baseConditions: any[],
    eq: any,
    hipTypeTable: any,
    hipClusterTable: any,
    hipHazardTable: any,
    hazardousEventTable: any,
    disasterEventTable: any,
    disasterRecordsTable: any,
    query: any,
): Promise<any> {
    const hazardTypeId = filters.hazardTypeId != null ? String(filters.hazardTypeId).trim() : null;
    const hazardClusterId = filters.hazardClusterId != null ? String(filters.hazardClusterId).trim() : null;
    const specificHazardId = filters.specificHazardId != null ? String(filters.specificHazardId).trim() : null;

    const hazardFiltersExist = hazardTypeId || hazardClusterId || specificHazardId;

    // Always add the joins regardless of filters
    query = query
        .innerJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
        .innerJoin(hazardousEventTable, eq(disasterEventTable.hazardousEventId, hazardousEventTable.id));

    logger.debug("Added required table joins", {
        joinsAdded: ["disasterEvent", "hazardousEvent"]
    });

    // If no filters exist, return the query with joins
    if (!hazardFiltersExist) {
        return query;
    }

    logger.debug("Initiating hazard filter cascade", {
        filtersToApply: {
            hazardTypeId: !!hazardTypeId,
            hazardClusterId: !!hazardClusterId,
            specificHazardId: !!specificHazardId
        }
    });

    // ✅ Apply WHERE filters based on hazard hierarchy
    let conditionsAdded = 0;

    if (hazardTypeId) {
        baseConditions.push(eq(hazardousEventTable.hipTypeId, hazardTypeId));
        conditionsAdded++;
        logger.debug("Applied hazard type filter", { hazardTypeId });
    }

    if (hazardClusterId) {
        baseConditions.push(eq(hazardousEventTable.hipClusterId, hazardClusterId));
        conditionsAdded++;
        logger.debug("Applied hazard cluster filter", { hazardClusterId });
    }

    if (specificHazardId) {
        baseConditions.push(eq(hazardousEventTable.hipHazardId, specificHazardId));
        conditionsAdded++;
        logger.debug("Applied specific hazard filter", { specificHazardId });
    }

    logger.info("Applied hazard filters to conditions", {
        conditionsAdded,
        totalConditions: baseConditions.length
    });

    // ✅ Hierarchical validation (non-blocking)
    try {
        if (specificHazardId) {
            logger.debug("Starting specific hazard validation", { specificHazardId });

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
                logger.debug("Found hazard hierarchy record", {
                    hazardId: record.hazardId,
                    clusterId: record.clusterId,
                    typeId: record.typeId
                });

                if (hazardClusterId && record.clusterId !== hazardClusterId) {
                    logger.warn("Hazard cluster mismatch detected", {
                        specificHazardId,
                        actualClusterId: record.clusterId,
                        expectedClusterId: hazardClusterId,
                        issue: "specificHazard does not belong to expected cluster"
                    });
                }

                if (hazardTypeId && record.typeId !== hazardTypeId) {
                    logger.warn("Hazard type mismatch detected", {
                        specificHazardId,
                        actualTypeId: record.typeId,
                        expectedTypeId: hazardTypeId,
                        issue: "specificHazard hierarchy does not match expected type"
                    });
                }

                logger.info("Specific hazard validation completed", {
                    specificHazardId,
                    validationPassed: (!hazardClusterId || record.clusterId === hazardClusterId) &&
                        (!hazardTypeId || record.typeId === hazardTypeId)
                });
            } else {
                logger.warn("Specific hazard not found in hierarchy", {
                    specificHazardId,
                    issue: "hazard ID does not exist in database"
                });
            }
        } else if (hazardClusterId && hazardTypeId) {
            logger.debug("Starting cluster-type validation", { hazardClusterId, hazardTypeId });

            const clusterValidation = await dr
                .select({
                    clusterId: hipClusterTable.id,
                    typeId: hipClusterTable.typeId,
                })
                .from(hipClusterTable)
                .where(eq(hipClusterTable.id, hazardClusterId))
                .limit(1);

            const record = clusterValidation[0];
            if (record) {
                if (record.typeId !== hazardTypeId) {
                    logger.warn("Cluster type mismatch detected", {
                        hazardClusterId,
                        actualTypeId: record.typeId,
                        expectedTypeId: hazardTypeId,
                        issue: "cluster does not belong to expected type"
                    });
                } else {
                    logger.debug("Cluster-type validation passed", {
                        hazardClusterId,
                        hazardTypeId
                    });
                }
            } else {
                logger.warn("Hazard cluster not found", {
                    hazardClusterId,
                    issue: "cluster ID does not exist in database"
                });
            }
        }
    } catch (error) {
        logger.error("Error during hazard hierarchy validation", {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            hazardTypeId,
            hazardClusterId,
            specificHazardId
        });
    }

    logger.info("Hazard filter application completed successfully", {
        filtersApplied: conditionsAdded,
        validationCompleted: true
    });

    return query;
}