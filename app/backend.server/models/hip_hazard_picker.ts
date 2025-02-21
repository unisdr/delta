import {dr} from "~/db.server";
import {hipClassTable, hipClusterTable, hipHazardTable} from "~/drizzle/schema";


export interface Class {
	id: string;
	name: string;
}

export interface Cluster {
	id: string;
	classId: string;
	name: string;
}

export interface Hazard {
	id: string;
	clusterId: string;
	name: string;
}

export interface HipDataForHazardPicker {
	classes: Class[]
	clusters: Cluster[]
	hazards: Hazard[]
}

export async function dataForHazardPicker(): Promise<HipDataForHazardPicker> {
	const classes: Class[] = await dr
		.select({
			id: hipClassTable.id,
			name: hipClassTable.nameEn,
		})
		.from(hipClassTable);
	const clusters: Cluster[] = await dr.select({
		id: hipClusterTable.id,
		classId: hipClusterTable.classId,
		name: hipClusterTable.nameEn
	}).from(hipClusterTable);
	const hazards: Hazard[] = await dr.select({
		id: hipHazardTable.id,
		clusterId: hipHazardTable.clusterId,
		name: hipHazardTable.nameEn,
	}).from(hipHazardTable);
	return {
		classes,
		clusters,
		hazards,
	};
}

interface HIPFields {
	hipClassId?: null | string
	hipClusterId?: null | string
	hipHazardId?: null | string
}


// When updating hip fields, make sure they are all updated at the same time. So if csv,api,form sets one only on update, others will be unset. Also validates that parent is set in child is set.
export function getRequiredAndSetToNullHipFields(fields: HIPFields): "class" | "cluster" | "" {
	if (fields.hipClassId || fields.hipClusterId || fields.hipHazardId) {
		if (!fields.hipClassId) {
			fields.hipClassId = null
		}
		if (!fields.hipClusterId) {
			fields.hipClusterId = null
		}
		if (!fields.hipHazardId) {
			fields.hipHazardId = null
		}
	}
	if (fields.hipHazardId) {
		if (!fields.hipClusterId) {
			return "cluster"
		}
	}
	if (fields.hipClusterId) {
		if (!fields.hipClassId) {
			return "class"
		}
	}
	return ""
}
