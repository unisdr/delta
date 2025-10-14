import { Form } from "@remix-run/react";
import { TreeNode } from "primereact/treenode";
import { TreeSelect, TreeSelectChangeEvent } from "primereact/treeselect";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { PartialDivision } from "~/backend.server/models/division";
import { buildPrimeReactTreeNodes } from "~/util/PrimeReactUtil";

interface HazardType {
  id: string;
  name: string;
}

interface HazardCluster {
  id: string;
  name: string;
  typeId: string;
}

interface SpecificHazard {
  id: string;
  nameEn: string;
  clusterId: string;
}

interface FiltersProps {
	hazardTypes: HazardType[];
	hazardClusters: HazardCluster[];
	specificHazards: SpecificHazard[];
	geographicLevels: PartialDivision[];
	onClearFilters: () => void;
	selectedHazardClusterId: string | null;
	selectedSpecificHazardId: string | null;
	selectedGeographicLevelId: string | null;
}

const HazardFilters: React.FC<FiltersProps> = ({
	hazardTypes,
	hazardClusters,
	specificHazards,
	geographicLevels,
	onClearFilters,
	selectedHazardClusterId,
	selectedSpecificHazardId,
	selectedGeographicLevelId,
}) => {
	const [hazardTypeId, setHazardTypeId] = useState<string | null>(null);
	const [hazardClusterId, setHazardClusterId] = useState<string | null>(
		selectedHazardClusterId
	);
	const [specificHazardId, setSpecificHazardId] = useState<string | null>(
		selectedSpecificHazardId
	);
	const [fromDate, setFromDate] = useState<string | null>(null);
	const [toDate, setToDate] = useState<string | null>(null);

	useEffect(() => {
		setHazardClusterId(null);
		setSpecificHazardId(null);
	}, [hazardTypeId]);

	useEffect(() => {
		setSpecificHazardId(null);
	}, [hazardClusterId]);

	const handleApply = (e: React.FormEvent) => {
		if (!hazardTypeId) {
			Swal.fire({
				icon: "warning",
				text: "Please select a hazard type first.",
				confirmButtonText: "OK",
			});
			e.preventDefault();
			return;
		}
		// Validate that "To" date is not before "From" date if both are set
		if (fromDate && toDate) {
			const from = new Date(fromDate);
			const to = new Date(toDate);
			if (to < from) {
				Swal.fire({
					icon: "warning",
					text: "The 'To' date cannot be earlier than the 'From' date.",
					confirmButtonText: "OK",
				});
				e.preventDefault();
				return;
			}
		}
	};

	const handleClear = () => {
		setHazardTypeId(null);
		setHazardClusterId(null);
		setSpecificHazardId(null);
		setGeographicLevelId(null);
		setFromDate(null);
		setToDate(null);
		onClearFilters();
	};

	const filteredClusters = hazardTypeId
		? hazardClusters.filter((cluster) => cluster.typeId === hazardTypeId)
		: [];

	const filteredSpecificHazards = hazardClusterId
		? specificHazards.filter((hazard) => hazard.clusterId === hazardClusterId)
		: [];

	const data = buildPrimeReactTreeNodes(geographicLevels);
	const [nodes, setNodes] = useState<TreeNode[] | null>(null);
  const [geographicLevelId, setGeographicLevelId] = useState<string | null>(selectedGeographicLevelId)
	// const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
	useEffect(() => {
		setNodes(data);
	}, []);

	return (
		<Form method="post" onSubmit={handleApply}>
			{/* First Row: */}
			<div className="formgrid grid">
				<div className="field col-4 dts-form-component">
					<label htmlFor="hazard-type">Hazard Type *</label>
					<select
						id="hazard-type"
						name="hazardTypeId"
						value={hazardTypeId || ""}
						onChange={(e) => setHazardTypeId(e.target.value || null)}
					>
						<option value="">Select a hazard type</option>
						{hazardTypes.map((type) => (
							<option key={type.id} value={type.id}>
								{type.name}
							</option>
						))}
					</select>
				</div>
				<div className="field col-4 dts-form-component">
					<label htmlFor="hazard-cluster">Hazard Cluster</label>
					<select
						id="hazard-cluster"
						name="hazardClusterId"
						value={hazardClusterId || ""}
						onChange={(e) => setHazardClusterId(e.target.value || null)}
						disabled={!hazardTypeId}
					>
						<option value="">Select a hazard cluster</option>
						{filteredClusters.map((cluster) => (
							<option key={cluster.id} value={cluster.id}>
								{cluster.name}
							</option>
						))}
					</select>
				</div>
				<div className="field col-4 dts-form-component">
					<label htmlFor="specific-hazard">Specific Hazard</label>
					<select
						id="specific-hazard"
						name="specificHazardId"
						value={specificHazardId || ""}
						onChange={(e) => setSpecificHazardId(e.target.value || null)}
						disabled={!hazardClusterId}
					>
						<option value="">Select a specific hazard</option>
						{filteredSpecificHazards.map((hazard) => (
							<option key={hazard.id} value={hazard.id}>
								{hazard.nameEn}
							</option>
						))}
					</select>
				</div>
			</div>
			{/* Second Row */}
			<div className="formgrid grid ">
				<div className="field col-4">
					<label htmlFor="geographicLevelId" className="mb-4">
						Geographic Level
					</label>
					<TreeSelect
            id="geographicLevelId"
						value={geographicLevelId}
						options={nodes ?? []}
						onChange={(e: TreeSelectChangeEvent) => 
              setGeographicLevelId(e.target.value as string | null)
						}
						className="w-full"
						placeholder="Select Item"
					></TreeSelect>
				</div>
        <input type="hidden" name="geographicLevelId" value={geographicLevelId ?? ""} />
				<div className="field col-4 dts-form-component">
					<label htmlFor="from-date">From</label>
					<input
						type="date"
						id="from-date"
						name="fromDate"
						value={fromDate || ""}
						onChange={(e) => setFromDate(e.target.value || null)}
					/>
				</div>
				<div className="field col-4 dts-form-component">
					<label htmlFor="to-date">To</label>
					<input
						type="date"
						id="to-date"
						name="toDate"
						value={toDate || ""}
						onChange={(e) => setToDate(e.target.value || null)}
					/>
				</div>
			</div>

			{/* Buttons */}
			<div className="flex justify-content-end">
				<button
					className="mg-button mg-button--small mg-button-outline m-2"
					type="button"
					onClick={handleClear}
				>
					Clear
				</button>
				<button
					className="mg-button mg-button--small mg-button-primary m-2"
					type="submit"
				>
					Apply Filters
				</button>
			</div>
		</Form>
	);
};

export default HazardFilters;