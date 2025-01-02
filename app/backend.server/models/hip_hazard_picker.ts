import {dr} from "~/db.server";
import {hipClassTable, hipClusterTable, hipHazardTable} from "~/drizzle/schema";


export interface Class {
	id: number;
	name: string;
}

export interface Cluster {
	id: number;
	classId: number;
	name: string;
}

export interface Hazard {
	id: string;
	clusterId: number;
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
