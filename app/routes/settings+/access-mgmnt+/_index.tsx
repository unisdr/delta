import { useLoaderData, Link, MetaFunction } from "@remix-run/react";
import { authLoaderWithPerm } from "~/util/auth";
import { Pagination } from "~/frontend/pagination/view";
import { executeQueryForPagination } from "~/frontend/pagination/api.server";
import { userTable } from "~/drizzle/schema";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useEffect, useState } from "react";
// import Swal from "sweetalert2";
// import "sweetalert2/dist/sweetalert2.min.css";
import { FaEye, FaTrashAlt, FaUserEdit } from "react-icons/fa";
import { format } from "date-fns";

export const meta: MetaFunction = () => {
	return [
		{ title: "Access Management - DTS" },
		{ name: "description", content: "Access Management." },
	];
};

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const { request } = loaderArgs;
	const url = new URL(request.url);
	const search = url.searchParams.get("search") || "";

	const select = {
		id: userTable.id,
		email: userTable.email,
		firstName: userTable.firstName,
		lastName: userTable.lastName,
		role: userTable.role,
		organization: userTable.organization,
		emailVerified: userTable.emailVerified,
		authType: userTable.authType,
		modifiedAt: userTable.updatedAt,
	};

	const res = await executeQueryForPagination<UserRes>(
		request,
		userTable,
		select,
		null
	);

	return {
		...res,
		search,
	};
});

interface UserRes {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	organization: string;
	emailVerified: string;
	auth: string;
	authType: string;
	modifiedAt: Date;
}

export default function Settings() {
	const ld = useLoaderData<typeof loader>();
	const { items, search } = ld;

	const [isClient, setIsClient] = useState(false);

	// Ensure client-specific rendering only occurs after the component mounts
	useEffect(() => {
		setIsClient(true);
		setFilteredItems(items); // Ensure data is consistent
	}, [items]);

	// State for search and filtered users
	const [filteredItems, setFilteredItems] = useState<UserRes[]>(items);
	const [organizationFilter, setOrganizationFilter] = useState("");
	const [roleFilter, setRoleFilter] = useState("");

	// Dynamically calculate pagination
	const pagination = Pagination({
		itemsOnThisPage: filteredItems.length, // Pass the dynamically filtered count
		totalItems: items.length, // Total items in the dataset
		page: ld.pagination.page, // Current page
		pageSize: ld.pagination.pageSize, // Items per page
		extraParams: ld.pagination.extraParams, // Additional query params
	});

	// Filter logic
	// const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
	// 	const value = e.target.value.toLowerCase();
	// 	setFilteredItems(
	// 		items.filter(
	// 			(item) =>
	// 				item.email.toLowerCase().includes(value) ||
	// 				item.firstName.toLowerCase().includes(value) ||
	// 				item.lastName.toLowerCase().includes(value)
	// 		)
	// 	);
	// };

	const handleOrganizationFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.toLowerCase();
		setOrganizationFilter(value);
		setFilteredItems(
			items.filter((item) => item.organization.toLowerCase().includes(value))
		);
	};

	const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedRole = e.target.value;
		setRoleFilter(selectedRole);

		// Update the table data based on the selected role
		const filteredData =
			selectedRole === "all"
				? items // Show all roles
				: items.filter((item) => item.role === selectedRole);
		setFilteredItems(filteredData);
	};

	// Calculate user stats
	const totalUsers = items.length;

	// Handle different formats for `emailVerified`
	const activatedUsers = filteredItems.filter((item) => {
		const emailVerified = item.emailVerified?.toString().toLowerCase();
		return emailVerified === "true";
	}).length;

	//const pendingUsers = totalUsers - activatedUsers;
	const pendingUsers = filteredItems.filter(
		(item) => !item.emailVerified
	).length;

	// // Handle user deletion
	// const handleDeleteUser = (userId: number) => {
	// 	Swal.fire({
	// 		title: "Are you sure you want to delete this user?",
	// 		text: "This data cannot be recovered after being deleted.",
	// 		icon: "warning",
	// 		showCancelButton: true,
	// 		confirmButtonColor: "#d33",
	// 		cancelButtonColor: "#3085d6",
	// 		confirmButtonText: '<i class="fas fa-trash"></i> Delete user',
	// 		cancelButtonText: "Do not delete",
	// 		showClass: { popup: "swal2-show" },
	// 		hideClass: { popup: "swal2-hide" },
	// 	}).then(async (result) => {
	// 		if (result.isConfirmed) {
	// 			try {
	// 				const response = await fetch(
	// 					`/settings/access-mgmnt/delete/${userId}`,
	// 					{
	// 						method: "GET",
	// 					}
	// 				);

	// 				if (!response.ok) {
	// 					throw new Error(
	// 						`Failed to delete user. Status: ${response.status}`
	// 					);
	// 				}

	// 				Swal.fire({
	// 					title: "Deleted!",
	// 					text: "The user has been deleted.",
	// 					icon: "success",
	// 				}).then(() => {
	// 					window.location.href = "/settings/access-mgmnt/";
	// 				});
	// 			} catch (error) {
	// 				console.error("Error deleting user:", error);
	// 				Swal.fire(
	// 					"Error",
	// 					"Something went wrong while deleting the user.",
	// 					"error"
	// 				);
	// 			}
	// 		}
	// 	});
	// };

	return (
		<section className="dts-page-section">
			<MainContainer title="Access management" headerExtra={<NavSettings />}>
				<div className="dts-access-management mg-container">
					<div className="dts-external-links">
						<a
							href="/about/technical-specifications"
							className="dts-link"
							target="_blank"
							rel="noopener noreferrer"
						>
							Technical Specification
							<svg
								aria-hidden="true"
								focusable="false"
								role="img"
								style={{ marginLeft: "4px" }}
							>
								<use href="/assets/icons/external-link-open-new.svg#external"></use>
							</svg>
						</a>
						<a
							href="/settings/access-mgmnt/invite"
							className="mg-button mg-button-secondary"
						>
							Add User
						</a>
					</div>

					{/* Add User Button */}
					<div className="dts-access-management__top-bar">
						<h2 className="dts-element-summary__title">
							<span>Currently there are [{totalUsers}] users in the system.</span>
						</h2>
					</div>

					{/* Filter Form */}
					<form method="get" className="dts-form dts-access-management__filter-form">
						<div className="mg-grid mg-grid__col-5">
							{/* Organisation Filter */}
							<div className="dts-form-component">
								<label className="dts-form-component__label">
									Organisation
									<input
										type="search"
										name="organization"
										value={organizationFilter}
										placeholder="Type organisation name"
										className="dts-access-management__filter-input"
										onChange={handleOrganizationFilter}
										autoComplete="organization"
									/>
								</label>
							</div>

							{/* Role Filter */}
							<div className="dts-form-component">
								<label className="dts-form-component__label">
									Role
									<select
										name="role"
										className="dts-access-management__filter-select"
										value={roleFilter}
										onChange={handleRoleFilter}
									>
										<option value="all">All Roles</option>
										<option value="data-viewer">Data Viewer</option>
										<option value="data-collector">Data Collector</option>
										<option value="data-validator">Data Validator</option>
										<option value="admin">Admin</option>
									</select>
								</label>
							</div>
						</div>
					</form>


					{/* Search Form */}
					{/* <form method="get" className="search-form">
					<input
						type="text"
						name="search"
						defaultValue={search}
						placeholder="Search by email, first name, or last name"
						className="search-input"
						onChange={handleSearch}
						style={{
							width: "460px",
							padding: "10px",
							border: "1px solid #ccc",
							borderRadius: "4px",
							marginBottom: "20px",
						}}
					/>
				</form>

				{/* User Stats */}
					<div
						className="dts-access-management__user-stats-container"
					>
						{/* Total User Count */}
						<div className="dts-access-management__user-stats">
							<strong className="dts-body-label">
								{filteredItems.length} of {totalUsers} Users
							</strong>
						</div>

						{/* Status Legend */}
						<div className="dts-legend">
							<span className="dts-body-label">Status legend</span>

							<div className="dts-legend__item">
								<span className="dts-status dts-status--activated" aria-labelledby="legend7"></span>
								<span id="legend7">
									Account activated: {activatedUsers}
								</span>
							</div>

							<div className="dts-legend__item">
								<span className="dts-access-management__status-dot dts-access-management__status-dot--pending" aria-labelledby="legend8"></span>
								<span id="legend8">
									Account activation pending: {pendingUsers}
								</span>
							</div>
						</div>

					</div>

					{/* Users Table */}
					{isClient && (
						<div className="dts-access-management__table-container">
							<table className="dts-table dts-access-management__table">
								<thead>
									<tr>
										<th>Status</th>
										<th>Name</th>
										<th>Organisation</th>
										<th>Role</th>
										<th>Modified</th>
										{/* <th>Email</th>
									{/* <th>Email</th>
									<th>Email Verified</th>
									<th>Auth</th> */}
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredItems.map((item, index) => (
										<tr key={index}>
											<td
												className="dts-table__cell-centered"
											>
												<span
													className={`dts-access-management__status-dot ${item.emailVerified
														? "dts-access-management__status-dot--activated"
														: "dts-access-management__status-dot--pending"
														}`}
												>
													{/* Tooltip message */}
													<span className="dts-access-management__tooltip-text">
														{/* Tooltip text dynamically changes based on status */}
														{item.emailVerified ? "Activated" : "Pending"}
													</span>
													{/* Tooltip pointer */}
													<span className="dts-access-management__tooltip-pointer"></span>
												</span>
											</td>

											<td>
												<Link
													to={`/settings/access-mgmnt/edit/${item.id}`}
													className="link"
												>
													{item.firstName} {item.lastName}
												</Link>
											</td>
											<td>{item.organization}</td>
											{/* Updated Role Column with Badge */}
											<td>
												<span
													className="dts-access-management__role-badge"
												>
													{item.role.charAt(0).toUpperCase() + item.role.slice(1)}{" "}
													{/* Capitalizes the first letter */}
												</span>
											</td>
											<td>{format(item.modifiedAt, "dd-MM-yyyy")}</td>
											{/* <td>
											<Link to={`/settings/access-mgmnt/edit/${item.id}`} className="link">
												{item.email}
											</Link>
										</td> */}
											{/* <td>{item.emailVerified.toString()}</td> */}
											{/* <td>{item.authType}</td> */}
											<td>
												<div
													className="dts-access-management__action-cell"
												>
													{/* 
													<button
														className="icon-button"
														onClick={() => (window.location.href = `/settings/access-mgmnt/${item.id}`)}
													>
														<FaEye
															style={{
																fontSize: "1.25rem", // Adjust the size of the icon if needed
																cursor: "pointer",
															}}
														/>
													</button>
												*/}
													<button
														className="mg-button mg-button--small mg-button-system dts-access-management__icon-button"
														onClick={() =>
															(window.location.href = `/settings/access-mgmnt/edit/${item.id}`)
														}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
															style={{ marginLeft: "4px" }}
														>
															<use href="/assets/icons/edit.svg#edit"></use>
														</svg>
														{/* <FaUserEdit
														style={{
															fontSize: "1.25rem", // Adjust the size of the icon if needed
															cursor: "pointer",
														}}
													/> */}
													</button>
													{/* <button
													className="icon-button"
													onClick={() => handleDeleteUser(item.id)}
												>
													<FaTrashAlt
														style={{
															fontSize: "1.25rem", // Adjust the size of the icon if needed
															cursor: "pointer",
														}}
													/>
												</button> */}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{/* Pagination */}
					{pagination}
				</div>
			</MainContainer>
		</section>

	);
}
