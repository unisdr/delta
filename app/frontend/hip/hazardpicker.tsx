import {useState, useEffect} from "react"
import {Field} from "~/frontend/form"

export interface HazardPickerProps {
	defaultValue: string
	name: string
	hip: Hip
	required?: boolean
}

export interface Hip {
	classes: Class[]
	clusters: Cluster[]
	hazards: Hazard[]
}

export interface Class {
	id: number
	name: string
}

export interface Cluster {
	id: number
	classId: number
	name: string
}

export interface Hazard {
	id: string
	clusterId: number
	name: string
}

function sortByName<T extends {name: string}>(array: T[]): T[] {
	return [...array].sort((a, b) => a.name.localeCompare(b.name))
}

export function HazardPicker(props: HazardPickerProps) {
	const [isClient, setIsClient] = useState(false)
	const [searchTerm, setSearchTerm] = useState("")

	useEffect(() => {
		setIsClient(true)
	}, [])

	const classes = sortByName(props.hip.classes)
	const clusters = sortByName(props.hip.clusters)
	const hazards = sortByName(props.hip.hazards)

	const [selectedClass, setSelectedClass] = useState<number | null>(null)
	const [selectedCluster, setSelectedCluster] = useState<number | null>(null)
	const [selectedHazard, setSelectedHazard] = useState<string | null>(null)

	useEffect(() => {
		if (!props.defaultValue) {
			setSelectedClass(null)
			setSelectedCluster(null)
			setSelectedHazard(null)
			return
		}
		setSelectedHazard(props.defaultValue)
		const defaultHazard = hazards.find((h) => h.id == props.defaultValue)
		if (!defaultHazard) {
			throw "hazard not found"
		}
		setSelectedCluster(defaultHazard.clusterId)
		const defaultCluster = clusters.find(
			(c) => c.id === defaultHazard.clusterId
		)
		if (!defaultCluster) {
			throw "cluster not found"
		}
		setSelectedClass(defaultCluster.classId)
	}, [props.defaultValue])


	let filteredClasses = classes
	let filteredClusters = clusters
	let filteredHazards = hazards

	if (searchTerm) {
		filteredHazards = hazards.filter((h) =>
			h.name.toLowerCase().includes(searchTerm.toLowerCase())
		)

		filteredClusters = clusters.filter((c) =>
			filteredHazards.some((h) => h.clusterId == c.id)
		)

		filteredClasses = classes.filter((c) =>
			filteredClusters.some((cl) => cl.classId == c.id)
		)
	}

	if (selectedClass) {
		filteredClusters = filteredClusters.filter((c) => c.classId == selectedClass)
		filteredHazards = filteredHazards.filter((h) =>
			filteredClusters.some((c) => c.id === h.clusterId)
		)
	}

	if (selectedCluster) {
		filteredHazards = filteredHazards.filter((h) => h.clusterId == selectedCluster)
	}

	if (!isClient) {
		return <p>Please enable Javascript</p>
	}

	return (
		<>
			<div className="dts-form-component">
				<Field label="Filter By Hazard Name">
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => {
							let term = e.target.value.toLowerCase()
							setSearchTerm(term)
							setSelectedClass(null)
							setSelectedCluster(null)
							if (term) {
								let matchedHazards = hazards.filter((h) =>
									h.name.toLowerCase().includes(term)
								)
								if (matchedHazards.length) {
									setSelectedHazard(matchedHazards[0].id)
								} else {
									setSelectedHazard(null)
								}
							} else {
								setSelectedHazard(null)
							}
						}}
						placeholder="Filter by hazard name..."
					/>
				</Field>
			</div>

			<div className="mg-grid mg-grid__col-3">
				<div className="dts-form-component">
					<Field label={`Hazard Class (${filteredClasses.length})`}>
						<select
							required={props.required}
							value={selectedClass || ""}
							onChange={(e) => {
								setSelectedClass(Number(e.target.value))
								setSelectedCluster(null)
								setSelectedHazard("")
							}}
						>
							{filteredClasses.length == 1 ? (
								<option key={filteredClasses[0].id} value={filteredClasses[0].id}>
									{filteredClasses[0].name}
								</option>
							) : (
								<>
									<option value="">Select Class</option>
									{filteredClasses.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</>
							)}
						</select>
					</Field>
				</div>

				<div className="dts-form-component">
					<Field label={`Hazard Cluster (${filteredClusters.length})`}>
						<select
							required={props.required}
							value={selectedCluster || ""}
							onChange={(e) => {
								setSelectedCluster(Number(e.target.value))
								setSelectedHazard("")
							}}
						//disabled={!filteredClusters.length}
						>
							{filteredClusters.length === 1 ? (
								<option key={filteredClusters[0].id} value={filteredClusters[0].id}>
									{filteredClusters[0].name}
								</option>
							) : (
								<>
									<option value="">Select Cluster</option>
									{filteredClusters.map((cluster) => (
										<option key={cluster.id} value={cluster.id}>
											{cluster.name}
										</option>
									))}
								</>
							)}
						</select>
					</Field>
				</div>

				<div className="dts-form-component">
					<Field label={`Specific Hazard (${filteredHazards.length})`}>
						<select
							required={props.required}
							name={props.name}
							value={selectedHazard || ""}
							onChange={(e) => {
								let hazardId = e.target.value
								setSelectedHazard(hazardId)
								let matchedHazard = hazards.find((h) => h.id === hazardId)
								if (matchedHazard) {
									let matchedCluster = clusters.find((c) => c.id === matchedHazard!.clusterId)
									setSelectedCluster(matchedCluster?.id || null)
									let matchedClass = classes.find((c) => c.id === matchedCluster?.classId)
									setSelectedClass(matchedClass?.id || null)
								}
							}}
						//disabled={!filteredHazards.length}
						>
							<option value="">Select Hazard</option>
							{filteredHazards.map((hazard) => (
								<option key={hazard.id} value={hazard.id}>
									{hazard.name}
								</option>
							))}
						</select>
					</Field>
				</div>
			</div>
		</>
	)
}

