import {dr} from "~/db.server";
import {hipTypeTable, hipClusterTable, hipHazardTable} from "~/drizzle/schema";


export interface Type {
	id: string;
	name: string;
}

export interface Cluster {
	id: string;
	typeId: string;
	name: string;
}

export interface Hazard {
	id: string;
	clusterId: string;
	name: string;
}

export interface HipDataForHazardPicker {
	types: Type[]
	clusters: Cluster[]
	hazards: Hazard[]
}

export async function dataForHazardPicker(): Promise<HipDataForHazardPicker> {
	const types: Type[] = await dr
		.select({
			id: hipTypeTable.id,
			name: hipTypeTable.nameEn,
		})
		.from(hipTypeTable);
	const clusters: Cluster[] = await dr.select({
		id: hipClusterTable.id,
		typeId: hipClusterTable.typeId,
		name: hipClusterTable.nameEn
	}).from(hipClusterTable);
	const hazards: Hazard[] = await dr.select({
		id: hipHazardTable.id,
		clusterId: hipHazardTable.clusterId,
		name: hipHazardTable.nameEn,
	}).from(hipHazardTable);
	return {
		types,
		clusters,
		hazards,
	};
}

interface HIPFields {
	hipTypeId?: null | string
	hipClusterId?: null | string
	hipHazardId?: null | string
}


// When updating hip fields, make sure they are all updated at the same time. So if csv,api,form sets one only on update, others will be unset. Also validates that parent is set in child is set.
export function getRequiredAndSetToNullHipFields(fields: HIPFields): "type" | "cluster" | "" {
	if (fields.hipTypeId || fields.hipClusterId || fields.hipHazardId) {
		if (!fields.hipTypeId) {
			fields.hipTypeId = null
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
		if (!fields.hipTypeId) {
			return "type"
		}
	}
	return ""
}
