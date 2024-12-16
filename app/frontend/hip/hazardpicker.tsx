import {useState} from "react";

import {
	Field,
} from "~/frontend/form";

import {useEffect} from "react";


export interface HazardPickerProps {
	defaultValue: string;
	name: string;
	hip: Hip;
	required?: boolean;
}

export interface Hip {
	classes: Class[]
	clusters: Cluster[]
	hazards: Hazard[]
}

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

function sortByName<T extends {name: string}>(array: T[]): T[] {
	return [...array].sort((a, b) => a.name.localeCompare(b.name));
}

export function HazardPicker(props: HazardPickerProps) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const classes = sortByName(props.hip.classes);
	const clusters = sortByName(props.hip.clusters);
	const hazards = sortByName(props.hip.hazards);

	const [selectedClass, setSelectedClass] = useState<number | null>(null);
	const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
	const [selectedHazard, setSelectedHazard] = useState<string | null>(null);

	useEffect(() => {
		if (!props.defaultValue) {
			setSelectedClass(null);
			setSelectedCluster(null);
			setSelectedHazard(null);
			return
		}
		setSelectedHazard(props.defaultValue);
		const defaultHazard = hazards.find((hazard) => hazard.id === props.defaultValue);
		if (!defaultHazard) {
			throw "hazard not found"
		}
		setSelectedCluster(defaultHazard.clusterId);
		const defaultCluster = clusters.find((cluster) => cluster.id === defaultHazard.clusterId);
		if (!defaultCluster) {
			throw "cluster not found"
		}
		setSelectedClass(defaultCluster.classId);

	}, [props.defaultValue]);

	const filteredClusters = clusters.filter(
		(cluster) => cluster.classId === selectedClass
	);
	const filteredHazards = hazards.filter(
		(hazard) => hazard.clusterId === selectedCluster
	);

	if (!isClient) {
		return <p>Please enable Javascript</p>
	}

	return (
		<>
			<Field label="Hazard Class">
				<select
					required={props.required}
					value={selectedClass || ""}
					onChange={(e) => {
						setSelectedClass(Number(e.target.value));
						setSelectedCluster(null);
						setSelectedHazard("");
					}}
				>
					<option value="">Select Class</option>
					{classes.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
			</Field>

			<Field label="Hazard Cluster">
				<select
					required={props.required}
					value={selectedCluster || ""}
					onChange={(e) => {
						setSelectedCluster(Number(e.target.value));
						setSelectedHazard("");
					}}
					disabled={!selectedClass}
				>
					<option value="">Select Cluster</option>
					{filteredClusters.map((cluster) => (
						<option key={cluster.id} value={cluster.id}>
							{cluster.name}
						</option>
					))}
				</select>
			</Field>

			<Field label="Specific Hazard">
				<select
					required={props.required}
					name={props.name}
					value={selectedHazard || ""}
					onChange={(e) => setSelectedHazard(e.target.value)}
					disabled={!selectedCluster}
				>
					<option value="">Select Hazard</option>
					{filteredHazards.map((hazard) => (
						<option key={hazard.id} value={hazard.id}>
							{hazard.name}
						</option>
					))}
				</select>
			</Field>
		</>
	);
}
