import {
	Link
} from "@remix-run/react";

import {HazardEventFields, HazardEventViewModel} from "~/backend.server/models/event"

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker"
import {formatDate} from "~/util/date";

import {useEffect, useState, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import { ContentRepeater } from "~/components/ContentRepeater";
import { TreeView, buildTree } from "~/components/TreeView";

export const route = "/hazard-event"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "otherId1", label: "Event id in other system", type: "text"},
	{key: "startDate", label: "Start Date", type: "date", required: true},
	{key: "endDate", label: "End Date", type: "date", required: true},
	{key: "description", label: "Description", type: "textarea"},
	{key: "chainsExplanation", label: "Composite Event - Chains Explanation", type: "text"},
	{key: "duration", label: "Duration", type: "text"},
	{key: "magnitude", label: "Magnitude", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other"},
	{key: "recordOriginator", label: "Record Originator", type: "text", required: true},
	{key: "dataSource", label: "Data Source", type: "text"},
] as const;

export const fieldsDef: FormInputDef<HazardEventFields>[] = [
	{key: "parent", label: "", type: "other"},
	{key: "hazardId", label: "Hazard", type: "other", required: true},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<HazardEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "API Import ID", type: "other"},
];

export const fieldsDefView: FormInputDef<HazardEventViewModel>[] = [
	{key: "hazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface HazardEventFormProps extends UserFormProps<HazardEventFields> {
	hip: Hip;
	parent?: HazardEventViewModel;
	treeData: any[];
}

export function hazardEventLabel(args: {
	id?: string;
	description?: string;
	hazard: {nameEn: string};
}): string {
	const hazardName = args.hazard.nameEn.slice(0, 50);
	const desc = args.description ? " " + args.description.slice(0, 50) : "";
	const shortId = args.id ? " " + args.id.slice(0, 5) : "";
	return hazardName + " " + desc + " " + shortId;
}

export function hazardEventLongLabel(args: {
	id?: string;
	description?: string;
	hazard: {nameEn: string};
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Description: {args.description || "-"}</li>
		<li>Hazard: {args.hazard.nameEn}</li>
	</ul>
}
export function hazardEventLink(args: {
	id: string;
	description: string;
	hazard: {nameEn: string};
}) {
	return <Link to={`/hazard-event/${args.id}`}>
		{hazardEventLabel(args)}
	</Link>
}

export function HazardEventForm(props: HazardEventFormProps) {
	const fields = props.fields;
	const treeData = props.treeData;

	const [selected, setSelected] = useState(props.parent);

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelected(event.data.selected);
			}
		};
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const targetObject = useRef<HTMLDivElement>(null);
	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);

	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="hazardous events"
			singular="hazardous event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				parent:
					<Field key="parent" label="Parent">
						{selected ? hazardEventLink(selected) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazard-event/picker"}>Change</Link>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				,
				hazardId: (
					<Field key="hazardId" label="Specific Hazard *">
						<HazardPicker name="hazardId" hip={props.hip} defaultValue={fields.hazardId || ""} required={true} />
						<FieldErrors errors={props.errors} field="hazardId"></FieldErrors>
					</Field>
				),
				spatialFootprint: (
					<Field key="spatialFootprint" label="Spatial Footprint">
						<ContentRepeater
							ref={contentReapeaterRef}
							id="spatialFootprint"
							mapper_preview={true}
							table_columns={[
								{ type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "40%" },
								{
									type: "custom",
									caption: "Option",
									render: (item) => {
										if (item.map_option === "Map Coordinates") {
											return (
												<>
													<span>Map Coordinates</span>
												</>
											);
										} else if (item.map_option === "Geographic Level") {
											return (
												<>
													<span>Geographic Level</span>
												</>
											);
										}
									},
									width: "40%",
								},                 
								{ type: "action", caption: "Action", width: "20%" },
							]}
							dialog_fields={[
								{ id: "title", caption: "Title", type: "input", required: true },
								{
									id: "map_option",
									caption: "Option",
									type: "option",
									options: ["Map Coordinates", "Geographic Level"],
									onChange: (e) => {
										const value = e.target.value;

										const mapsCoordsField = document.getElementById("spatialFootprint_map_coords") as HTMLInputElement;
										const geoLevelField = document.getElementById("spatialFootprint_geographic_level") as HTMLInputElement;
										
										if (value === "Map Coordinates") {
											mapsCoordsField.closest(".dts-form-component")?.style.setProperty("display", "block");
											geoLevelField.closest(".dts-form-component")?.style.setProperty("display", "none");
										} else if (value === "Geographic Level") {
											mapsCoordsField.closest(".dts-form-component")?.style.setProperty("display", "none");
											geoLevelField.closest(".dts-form-component")?.style.setProperty("display", "block");
										}
									},
								},
								{ id: "map_coords", caption: "Map Coordinates", type: "mapper", placeholder: "", mapperGeoJSONField: "geojson" },
								{ id: "geographic_level", caption: "Geographic Level", type: "custom",
									render: (data: any, handleFieldChange: any) => {
										return (
											<>
											  <div style={{ display: "flex", alignItems: "center", gap: "1%" }}>
												{/* Spatial Footprint Container */}
												<div
												  id="spatialFootprint_geographic_level_container"
												  style={{
													position: "relative",
													width: "100%",
													padding: "0.4rem 0.8rem",
													backgroundColor: "white",
													border: "1px solid #cccccc",
													borderRadius: "6px",
													color: "#999",
													minHeight: "3.5rem",
													overflow: "hidden",
													cursor: "pointer",
												  }}
												>
												  <span>{data}</span>
												  {/* Select Geographic Level Button */}
												  <a
													href="#"
													style={{
													  width: "auto",
													  zIndex: 1000,
													  textAlign: "center",
													  padding: "0.7rem 0.8rem",
													  color: "#000",
													  textDecoration: "none",
													  borderRadius: "4px",
													  display: "inline-flex",
													  alignItems: "center",
													  justifyContent: "center",
													  backgroundColor: "#cccccc",
													  position: "absolute",
													  top: "-2px",
													  right: "-2px",
													}}
													onClick={(e) => {
													  e.preventDefault();
													  treeViewRef.current?.treeViewOpen(e);
													}}
												  >
													<img
													  src="/assets/icons/globe.svg"
													  alt="Globe SVG File"
													  title="Globe SVG File"
													  style={{ width: "20px", height: "20px", marginRight: "0.5rem" }}
													/>
													Select
												  </a>
												</div>
										  
												{/* Hidden Textarea */}
												<textarea
												  id="spatialFootprint_geographic_level"
												  name="spatialFootprint_geographic_level"
												  className="dts-hidden-textarea"
												  style={{ display: "none" }}
												></textarea>
											  </div>
											</>
										  );										  
									}
								},
								{ id: "geojson", caption: "Map Coordinates / Geographic Level", type: "hidden", required: true },
							]}
							data={(() => {
								try {
								return fields && fields.spatialFootprint ? JSON.parse(fields.spatialFootprint) : [];
								} catch {
								return []; // Default to an empty array if parsing fails
								}
							})()}
							onChange={(items: any) => {
								try {
									const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
									console.log("Updated Items:", parsedItems);
									// Save or process `parsedItems` here, e.g., updating state or making an API call
								} catch {
									console.error("Failed to process items.");
								}
							}}
						/>
						<TreeView 
							ref={treeViewRef} 
							treeData={treeData} 
							caption="Select Geographic level" 
							rootCaption="Geographic levels" 
							onApply={
								(dialogRef: any, selectedItems: any) => {
									console.log('targetObject', contentReapeaterRef.current);

									if (contentReapeaterRef.current.getDialogRef()) {
										// Set Name in the div
										contentReapeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level_container span').textContent = selectedItems.names;
										// Set GeoJSON in the hidden textarea
										selectedItems.data.map((item: any) => {
											if (item.id == selectedItems.selectedId) {
												contentReapeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level').value = item.geojson;
												const setField = { id: "geojson", value: item.geojson };
												contentReapeaterRef.current.handleFieldChange(setField, item.geojson);

												const setFieldGoeLevel = { id: "geographic_level", value: selectedItems.names };
												contentReapeaterRef.current.handleFieldChange(setFieldGoeLevel, selectedItems.names);
											}
										});
									}
								}
							}
							onRenderItemName={
								(item: any) => {
									return (typeof(item.hiddenData.geojson) == "object") ? {disable: "false"} : {disable: "true"};
								}
							}
							appendCss={
								`
									ul.tree li div[disable="true"] {
										color: #ccc;
									}
									ul.tree li div[disable="true"] .btn-face.select {
										display: none;
									}
								`
							}
							disableButtonSelect={true}
						/>
					</Field>
				),
			}}
		/>
	);
}

interface HazardEventViewProps {
	item: HazardEventViewModel;
	isPublic: boolean
}

export function HazardEventView(props: HazardEventViewProps) {
	const item = props.item;
	let cluster = item.hazard.cluster;
	let cls = cluster.class;

	//Mapper
	const glbMapperJS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
	const glbMapperCSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
	const glbColors = {
	polygon: "#0074D9",
	line: "#FF851B",
	rectangle: "#2ECC40",
	circle: "#FF4136",
	marker: "#85144b"
	};
	const glbMarkerIcon = {
	iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Replace with your marker icon if necessary
	iconSize: [20, 20],
	iconAnchor: [5, 20],
	popupAnchor: [0, -20],
	shadowUrl: null, // Remove shadow
	className: "custom-leaflet-marker", // Add a custom class
	}
	const handlePreviewMap = (e: any) => {
		e.preventDefault();

		const newTab = window.open("", "_blank");
	  
		if (!newTab) {
		  alert("Popup blocker is preventing the map from opening.");
		  return;
		}
	  
		newTab.document.write(`
		  <!DOCTYPE html>
		  <html lang="en">
		  <head>
			<title>Map Preview</title>
			<link rel="stylesheet" href="${glbMapperCSS}" />
			<style>
			  #map {
				position: relative;
				display: block;
				width: 100%;
				height: 100vh;
			  }
			</style>
		  </head>
		  <body>
			<div id="map"></div>
			<script src="${glbMapperJS}"></script>
	<script>
	  const adjustZoomBasedOnDistance = (map, bounds, centers) => {
		console.log(bounds);
	
		let maxDistance = 0;
	
		if (centers.length === 1) {
		  // Calculate maxDistance for a single shape based on its bounds
		  const singleShapeBounds = bounds.isValid() ? bounds : null;
	
		  if (singleShapeBounds) {
			maxDistance = singleShapeBounds.getNorthEast().distanceTo(singleShapeBounds.getSouthWest());
		  } else {
			console.warn("No valid bounds available for the single shape.");
			map.setView(centers[0], 14); // Default zoom for a single center if no bounds
			return;
		  }
		} else {
		  // Calculate the maximum distance between all centers
		  for (let i = 0; i < centers.length; i++) {
			for (let j = i + 1; j < centers.length; j++) {
			  const distance = centers[i].distanceTo(centers[j]);
			  maxDistance = Math.max(maxDistance, distance);
			}
		  }
		}
	
		// Define zoom level thresholds based on distances
		const globalLevelDistance = 10000000; // ~10,000km
		const regionalLevelDistance = 5000000; // ~5,000km
		const countryLevelDistance = 1000000; // ~1,000km
		const cityLevelDistance = 100000; // ~100km
		const townLevelDistance1 = 20000; // ~20km
		const townLevelDistance2 = 15000; // ~15km
		const townLevelDistance3 = 10000; // ~10km
		const townLevelDistance4 = 5000; // ~5km
	
		let calculatedZoom;
	
		// Adjust zoom based on maximum distance
		if (maxDistance > globalLevelDistance) {
		  calculatedZoom = 2; // Minimum zoom for global scale
		} else if (maxDistance > regionalLevelDistance) {
		  calculatedZoom = 4; // Regional scale
		} else if (maxDistance > countryLevelDistance) {
		  calculatedZoom = 7; // Country-level zoom
		} else if (maxDistance > cityLevelDistance) {
		  calculatedZoom = 10; // City-level zoom
		} else if (maxDistance > townLevelDistance1) {
		  calculatedZoom = 11; // Town-level zoom
		} else if (maxDistance > townLevelDistance2) {
		  calculatedZoom = 12; // Town-level zoom
		} else if (maxDistance > townLevelDistance3) {
		  calculatedZoom = 13; // Town-level zoom
		} else if (maxDistance > townLevelDistance4) {
		  calculatedZoom = 14; // Town-level zoom
		} else {
		  calculatedZoom = 17; // Local zoom for nearby shapes
		}
	
		console.log("maxDistance:", maxDistance);
		console.log("calculatedZoom:", calculatedZoom);
	
		// Fit bounds first with padding
		map.fitBounds(bounds, {
		  padding: [50, 50],
		});
	
		// Set the zoom level dynamically
		map.setZoom(Math.min(map.getZoom(), calculatedZoom));
	  };
	
	window.onload = () => {
		document.getElementById("map").style.height = "${window.outerHeight - 100}px";
	
		const map = L.map("map").setView([43.833, 87.616], 2);
	
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "&copy; OpenStreetMap contributors",
		}).addTo(map);
	
		const items = ${JSON.stringify(JSON.parse(item.spatialFootprint))};
		const boundsArray = [];
		const centers = [];
	
		items.forEach((item) => {
			try {
				const geojsonData = JSON.parse(item.geojson); // Replace map_coords with geojson
	
				L.geoJSON(geojsonData, {
					style: (feature) => ({
						color: getColorForType(feature.geometry.type),
						weight: 2,
					}),
					pointToLayer: (feature, latlng) => {
						if (feature.geometry.type === "Point") {
							return L.marker(latlng, {
								icon: L.icon(${JSON.stringify(glbMarkerIcon)}),
							});
						}
						return L.circleMarker(latlng, {
							radius: 5,
							fillColor: getColorForType(feature.geometry.type),
							color: "#000",
							weight: 1,
							opacity: 1,
							fillOpacity: 0.8
						});
					},
					onEachFeature: (feature, layer) => {
						if (feature.geometry.type !== "Point") {
							boundsArray.push(layer.getBounds());
							centers.push(layer.getBounds().getCenter());
						} else {
							centers.push(layer.getLatLng());
						}
					},
				}).addTo(map);
			} catch (error) {
				console.error("Error parsing GeoJSON:", error);
			}
		});
	
		if (boundsArray.length > 0) {
			const bounds = L.latLngBounds(boundsArray.flat());
			adjustZoomBasedOnDistance(map, bounds, centers);
		} else {
			console.warn("No valid bounds available for fitting the map.");
		}
	};
	
	// Function to dynamically assign colors for different geometry types
	function getColorForType(geometryType) {
		const colors = {
			Point: "${glbColors.markers}",
			LineString: "${glbColors.line}",
			Polygon: "${glbColors.polygon}",
			MultiPolygon: "${glbColors.polygon}",
			MultiPoint: "${glbColors.markers}",
			MultiLineString: "${glbColors.line}",
		};
		return colors[geometryType] || "black";
	}
	
	
	</script>
	
		  </body>
		  </html>
		`);
	  
		newTab.document.close();
	};

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Hazardous events"
			singular="Hazard event"
			extraActions={
				<>
					<p>
						<Link to={`${route}/new?parent=${item.id}`}>Add Hazardous Event caused by this event</Link>
					</p>
				</>
			}
			extraInfo={
				<>
					{item.event.ps.length > 0 && (() => {
						const parent = item.event.ps[0].p.he;
						return (
							<p>
								Caused By:&nbsp;
								{hazardEventLink(parent)}
							</p>
						);
					})()}

					{item.event.cs.length > 0 && (
						<>
							<p>Causing:</p>
							{item.event.cs.map((child) => {
								const childEvent = child.c.he;
								return (
									<p key={child.childId}>
										{hazardEventLink(childEvent)}
									</p>
								);
							})}
						</>
					)}
				</>
			}
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				override={{
					hazard: (
						<div key="hazard">
							<p>Class: {cls.nameEn}</p>
							<p>Cluster: {cluster.nameEn}</p>
							<p>Hazard ID: {item.hazard.id}</p>
							<p>Hazard Name: {item.hazard.nameEn}</p>
						</div>
					),
					createdAt: (
						<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
					),
					updatedAt: (
						<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
					),
				}}
				otherRenderView={{
					spatialFootprint: (
					  <div>
						<p>Spatial Footprint:</p>
						{(() => {
						  try {
							const footprints = JSON.parse(item.spatialFootprint); // Parse JSON string

							return (
							  <>
							  <table style={{ borderCollapse: "collapse", width: "100%", border: "1px solid #ddd", marginBottom: "2rem" }}>
								<thead>
								  <tr style={{ backgroundColor: "#f4f4f4" }}>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Title</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Option</th>
								  </tr>
								</thead>
								<tbody>
								  {footprints.map((footprint: any, index: number) => {
									try {
									  const option = footprint.map_option || "Unknown Option";
									  return (
										<tr key={footprint.id || index}>
										  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{footprint.title}</td>
										  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{option}</td>
										</tr>
									  );
									} catch {
									  return (
										<tr key={index}>
										  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{footprint.title}</td>
										  <td style={{ border: "1px solid #ddd", padding: "8px", color: "red" }}>Invalid Data</td>
										</tr>
									  );
									}
								  })}
								</tbody>
							  </table>
								<button 
								onClick={handlePreviewMap} 
								style={{
									padding: "10px 16px",
									border: "1px solid #ddd",
									backgroundColor: "#f4f4f4",
									color: "#333",
									fontSize: "14px",
									fontWeight: "bold",
									borderRadius: "4px",
									marginBottom: "2rem",
									cursor: "pointer"
								}}
								>
								Map Preview
								</button>
							  </>
							);
							
						  } catch {
							return <p>Invalid JSON format in spatialFootprint.</p>;
						  }
						})()}
					  </div>
					),
				}}											  
			/>
		</ViewComponent>
	);
}


