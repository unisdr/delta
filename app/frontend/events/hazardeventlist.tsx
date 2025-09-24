import { useEffect, useRef } from "react";

import { useLoaderData, Link, useRouteLoaderData } from "@remix-run/react";

import { Pagination } from "~/frontend/pagination/view";

import { HazardPicker } from "~/frontend/hip/hazardpicker";

import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/hazardeventform";

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";

import { createFloatingTooltip } from "~/util/tooltip";

import { EventCounter } from "~/components/EventCounter";
import { Filters } from "../components/list-page-filters";
import { formatDateDisplay } from "~/util/date";
import { roleHasPermission } from "~/frontend/user/roles";

interface ListViewArgs {
	isPublic: boolean;
	basePath: string;
	linksNewTab?: boolean;
	actions?: (item: any) => React.ReactNode;
}

/**
 * Helper function to get the appropriate hazard name based on hierarchy
 * Shows specific hazard if available, otherwise cluster, otherwise type
 */
function getHazardDisplayName(item: any): string {
	if (item.hipHazard?.nameEn) {
		return item.hipHazard.nameEn;
	} else if (item.hipCluster?.nameEn) {
		return item.hipCluster.nameEn;
	} else if (item.hipType?.nameEn) {
		return item.hipType?.nameEn || "";
	}
	return "";
}

/**
 * Determines if a user can edit a hazardous event
 * Based on business rules:
 * - Data-viewers cannot edit any records
 * - Data collectors can edit their own records when status is Draft or Waiting for validation
 * - Data validators/Admins can edit their own created records under same statuses
 */
function canEdit(item: any, user: any): boolean {
	if (!user) return false;
	
	// Data-viewers cannot edit any records
	if (user.role === "data-viewer") return false;
	
	// Admin users should always be able to edit draft and waiting for validation records
	if (user.role === "admin" || user.role === "super_admin") {
		// Check record status - only Draft or Waiting for validation can be edited
		const editableStatuses = ["draft", "waiting-for-validation"];
		return editableStatuses.includes(item.approvalStatus.toLowerCase());
	}
	
	// For non-admin users
	// Check if user has edit permission
	const hasEditPermission = roleHasPermission(user.role, "EditData");
	if (!hasEditPermission) return false;
	
	// Check record status - only Draft or Waiting for validation can be edited
	const editableStatuses = ["draft", "waiting-for-validation"];
	if (!editableStatuses.includes(item.approvalStatus.toLowerCase())) return false;
	
	// Check if user created the record (simplified check - would need actual user ID comparison)
	// This is a placeholder - actual implementation would need to check item.createdBy against user.id
	return true;
}

/**
 * Determines if a user can delete a hazardous event
 * Based on business rules:
 * - Data-viewers cannot delete any records
 * - Only Data validators/Admins who are assigned to validate or have already validated a record can delete
 * - Records that are Published or Validated by someone else cannot be deleted
 */
function canDelete(item: any, user: any): boolean {
	if (!user) return false;
	
	// Data-viewers cannot delete any records
	if (user.role === "data-viewer") return false;
	
	// Admin users should be able to delete non-published records
	if (user.role === "admin" || user.role === "super_admin") {
		// Published records cannot be deleted
		return item.approvalStatus.toLowerCase() !== "published";
	}
	
	// For non-admin users
	// Check if user has delete permission
	const hasDeletePermission = roleHasPermission(user.role, "DeleteValidatedData");
	if (!hasDeletePermission) return false;
	
	// Published records cannot be deleted
	if (item.approvalStatus.toLowerCase() === "published") return false;
	
	// Check if user is assigned to validate or has validated the record
	// This is a placeholder - actual implementation would need to check validation assignments
	return true;
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof hazardousEventsLoader>>>();
	const rootData = useRouteLoaderData("root") as any; // Get user data from root loader
	
	// Get user data with role from root loader
	const user = {
		...rootData?.user,
		role: rootData?.userRole || rootData?.user?.role // Use userRole from root data if available
	};

	const { hip, filters } = ld;
	const { items } = ld.data;

	const pagination = Pagination(ld.data.pagination);

	// Store the total count in a ref that persists across renders
	const totalCountRef = useRef(ld.data.pagination.totalItems);

	// Check if this is an unfiltered view
	const isUnfiltered = !filters.hipHazardId && !filters.hipClusterId && !filters.hipTypeId && !filters.search;

	// Use effect to update the ref when we see an unfiltered view with a higher count
	useEffect(() => {
		if (isUnfiltered && ld.data.pagination.totalItems > totalCountRef.current) {
			totalCountRef.current = ld.data.pagination.totalItems;
		}
	}, [isUnfiltered, ld.data.pagination.totalItems]);

	// Debug pagination values
	// console.log('Pagination data:', {
	// 	paginationObj: pagination,
	// 	originalPagination: ld.data.pagination,
	// 	itemsLength: items.length,
	// 	totalItems: ld.data.pagination.totalItems,
	// 	totalCountRef: totalCountRef.current,
	// 	isUnfiltered
	// });

	// Refs for the status elements
	const statusRefs = useRef(new Map<number, HTMLElement>());

	useEffect(() => {
		if (typeof window !== "undefined") {
			// This check ensures that DOM-related code runs only in the browser
			items.forEach((item, index) => {
				const element = statusRefs.current.get(index);
				if (element) {
					createFloatingTooltip({
						content: item.approvalStatus,
						target: element,
						placement: "top",
						offsetValue: 8, // You can adjust this value based on your UI needs
						arrowSelector: ".dts-tooltip__arrow", // Ensure you have this CSS class in your styles
					});
				}
			});
		}
	}, [items]);

	return (
		<div>
			<Filters
				search={filters.search}
				clearFiltersUrl={args.basePath}
				formStartElement=
				<>
					{/* <h4>Hazard classification</h4> */}
					<HazardPicker
						hip={hip}
						hazardId={filters.hipHazardId}
						clusterId={filters.hipClusterId}
						typeId={filters.hipTypeId}
					/>
				</>
			/>
			{!args.isPublic && (
				<>
					<div>
						{/* Add the EventCounter component */}
						<span>
							<strong>
								<EventCounter filteredEvents={items.length} totalEvents={totalCountRef.current} />
							</strong>
						</span>
					</div>
					<div className="dts-legend">
						<span className="dts-body-label">Record Status</span>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--draft"
								aria-labelledby="legend1"
							></span>
							<span id="legend1">Draft</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--waiting-for-validation"
								aria-labelledby="legend2"
							></span>
							<span id="legend2">Waiting for validation</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--needs-revision"
								aria-labelledby="legend3"
							></span>
							<span id="legend3">Needs revision</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--validated"
								aria-labelledby="legend4"
							></span>
							<span id="legend4">Validated</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--published"
								aria-labelledby="legend5"
							></span>
							<span id="legend5">Published</span>
						</div>
					</div>
				</>
			)}
			
			{ld.data.pagination.totalItems ? (
				<>
					<table className="dts-table">
						<thead>
							<tr>
								<th>Hazard</th>
								{!args.isPublic && <th>Record Status</th>}
								<th>Hazardous Event UUID</th>
								<th>Created</th>
								<th>Updated</th>
								{!args.isPublic && <th>Actions</th>}
							</tr>
						</thead>
						<tbody>
							{items.map((item, index) => (
								<tr key={index}>
									<td>{getHazardDisplayName(item)}</td>
									{!args.isPublic && (
										<td className="dts-table__cell-centered">
											<span
												ref={(el) => statusRefs.current.set(index, el!)}
												className={`dts-status dts-status--${item.approvalStatus.toLowerCase()}`}
											></span>
										</td>
									)}
									<td>
										<Link
											to={`/hazardous-event/${item.id}`}
											target={args.linksNewTab ? "_blank" : undefined}
										>
											{item.id}
										</Link>
									</td>
									<td>{formatDateDisplay(item.createdAt, "dd-MM-yyyy")}</td>
									<td>{formatDateDisplay(item.updatedAt, "dd-MM-yyyy")}</td>
									{!args.isPublic && (
										<td>
											{args.actions ? (
												args.actions(item)
											) : (
												<ActionLinks 
													route={route} 
													id={item.id} 
													hideEditButton={!canEdit(item, user)}
													hideDeleteButton={!canDelete(item, user)}
												/>
											)}
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
					{pagination}
				</>
			) : (
				"No hazardous events"
			)}
		</div>
	);
}
