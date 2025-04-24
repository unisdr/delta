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
		<MainContainer title="Access management" headerExtra={<NavSettings />}>
			{/* Scoped Inline Styles */}
			<style>{`
		.access-management-container {
		  padding: 20px;
		}

		.search-form {
		  display: flex;
		  align-items: center;
		  gap: 10px;
		  margin-bottom: 20px;
		}

		.search-input {
		  padding: 8px;
		  border: 1px solid #ccc;
		  border-radius: 4px;
		  width: 250px;
		}

		.action-button {
		  padding: 10px 15px;
		  background-color: #007bff;
		  color: white;
		  border: none;
		  border-radius: 4px;
		  cursor: pointer;
		  font-size: 14px;
		}

		.action-button:hover {
		  background-color: #0056b3;
		}


		.table-container {
			overflow-x: auto; /* Enables horizontal scrolling for wide tables */
			margin-top: 20px; /* Adds spacing above the table */
		}

		.table-styled {
		  width: 100%;
		  border-collapse: collapse;
		  margin-top: 20px;
		  font-size: 14px;
		  overflow-x: auto;
		}

		.table-styled th,
		.table-styled td {
		  padding: 12px 15px;
		  border: 1px solid #ddd;
		  text-align: left;
		}

		.table-styled th {
		  background-color: #f4f4f4;
		  font-weight: bold;
		  position: relative;
		}

		.filter-icon {
		  position: absolute;
		  right: 10px;
		  top: 50%;
		  transform: translateY(-50%);
		  cursor: pointer;
		}

		.table-styled tr:nth-child(even) {
		  background-color: #f9f9f9;
		}

		.icon-button {
		  background: none;
		  border: none;
		  cursor: pointer;
		  padding: 5px;
		  margin: 0 5px;
		}

		.icon-button img {
		  width: 16px;
		  height: 16px;
		}

		.link {
		  color: #007bff;
		  text-decoration: none;
		}

		.link:hover {
		  text-decoration: underline;
		}

		.user-stats {
		  display: flex;
		  gap: 20px;
		  margin-bottom: 20px;
		  font-size: 14px;
		}

		.user-stats span {
		  font-weight: bold;
		}

		.status-dot {
				height: 10px;
				width: 10px;
				border-radius: 50%;
				display: inline-block;
				margin-right: 5px;
				position: relative; /* Ensure relative positioning for tooltip */
			}

			.status-dot.activated {
				background-color: #007bff;
			}

			.status-dot.pending {
				background-color: #ccc;
			}

			.user-stats {
				display: flex;
				gap: 10px;
				align-items: center;
			}

			/* Tooltip styles */
.status-dot {
    position: relative; /* Required for positioning tooltip elements relative to the dot */
}

.status-dot:hover .tooltip-text,
.status-dot:hover .tooltip-pointer {
    visibility: visible; /* Show both the tooltip text and pointer on hover */
}

.tooltip-text {
    visibility: hidden;
    position: absolute;
    background-color: black;
    color: white;
    text-align: center;
    border-radius: 5px;
    padding: 5px 10px;
    white-space: nowrap;
    top: -45px; /* Position tooltip above the dot */
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
}

.tooltip-pointer {
    visibility: hidden;
    position: absolute;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid black; /* Matches the tooltip background */
    top: -10px; /* Adjusts the pointer to sit above the dot */
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
}


    /* Responsive Table */
    .table-container {
        overflow-x: auto;
    }
			
	  `}</style>

			<div className="access-management-container">
				{/* Add User Button */}
				<div
					className="top-bar"
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<div>Currently there are [{totalUsers}] users in the system.</div>
					<div className="dts-external-links">
						<a
							href="/about/technical-specifications"
							className="dts-link"
							target="_blank"
							rel="noopener noreferrer"
						>
							Technical Specification
							<svg aria-hidden="true" focusable="false" role="img" style={{ marginLeft: "4px" }}>
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
				</div>

				{/* Filter Form */}
				<form
					method="get"
					className="filter-form"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "1rem",
						marginBottom: "20px",
					}}
				>
					<div
						className="filter-row"
						style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}
					>
						<div
							className="filter-column"
							style={{ display: "flex", flexDirection: "column", gap: "5px" }}
						>
							<span>Organisation</span>
							<input
								type="search"
								name="organization"
								value={organizationFilter}
								placeholder="Type organisation name"
								className="filter-input"
								onChange={handleOrganizationFilter}
								style={{
									width: "220px",
									padding: "10px",
									border: "1px solid #ccc",
									borderRadius: "4px",
								}}
							/>
						</div>
						<div
							className="filter-column"
							style={{ display: "flex", flexDirection: "column", gap: "5px" }}
						>
							<span>Role</span>
							<select
								name="role"
								className="filter-select"
								value={roleFilter}
								onChange={handleRoleFilter}
								style={{
									width: "220px",
									padding: "10px",
									border: "1px solid #ccc",
									borderRadius: "4px",
								}}
							>
								<option value="">Select Role</option>
								<option value="all">All Roles</option>
								<option value="data-viewer">Data Viewer</option>
								<option value="data-collector">Data Collector</option>
								<option value="data-validator">Data Validator</option>
								<option value="admin">Admin</option>
							</select>
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
					className="user-stats-container"
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						marginBottom: "5px",
						fontSize: "14px",
					}}
				>
					{/* Total User Count */}
					<div className="user-stats" style={{ marginBottom: "10px" }}>
						<strong>
							{filteredItems.length} of {totalUsers} Users
						</strong>
					</div>

					{/* Status Legend */}
					<div
						className="status-legend"
						style={{
							display: "flex",
							alignItems: "center", // Ensures proper vertical alignment
							gap: "10px",
						}}
					>
						{/* "Status legend" in bold */}
						<div
							style={{
								fontWeight: "bold",
								marginRight: "10px", // Creates spacing after "Status legend"
							}}
						>
							Status legend:
						</div>

						{/* Status Items */}
						<div
							style={{
								display: "flex",
								alignItems: "center", // Ensures vertical alignment for all items
								gap: "20px",
							}}
						>
							{/* Account Activated */}
							<div
								className="status-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "5px", // Space between dot and text
									lineHeight: "1.2", // Ensures text aligns well with the dot
								}}
							>
								<div
									className="status-dot activated"
									style={{
										height: "10px",
										width: "10px",
										borderRadius: "50%",
										backgroundColor: "#007bff",
									}}
								></div>
								Account activated: {activatedUsers}
							</div>

							{/* Account Activation Pending */}
							<div
								className="status-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "5px", // Space between dot and text
									lineHeight: "1.2", // Ensures text aligns well with the dot
								}}
							>
								<div
									className="status-dot pending"
									style={{
										height: "10px",
										width: "10px",
										borderRadius: "50%",
										backgroundColor: "#ccc",
									}}
								></div>
								Account activation pending: {pendingUsers}
							</div>
						</div>
					</div>
				</div>

				{/* Users Table */}
				{isClient && (
					<div className="table-container">
						<table className="table-styled" style={{ marginTop: "0px" }}>
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
											style={{ textAlign: "center", verticalAlign: "middle" }}
										>
											<span
												className={`status-dot ${
													item.emailVerified ? "activated" : "pending"
												}`}
												style={{
													// Inline styles to ensure consistent dot appearance
													height: "10px",
													width: "10px",
													borderRadius: "50%",
													display: "inline-block",
													position: "relative",
												}}
											>
												{/* Tooltip message */}
												<span className="tooltip-text">
													{/* Tooltip text dynamically changes based on status */}
													{item.emailVerified ? "Activated" : "Pending"}
												</span>
												{/* Tooltip pointer */}
												<span className="tooltip-pointer"></span>
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
												style={{
													display: "inline-block",
													padding: "5px 10px",
													backgroundColor: "#fff3cd", // Light yellow
													border: "1px solid #ffeeba", // Slightly darker yellow
													borderRadius: "4px",
													color: "#856404", // Darker yellow text
													fontSize: "12px",
													fontWeight: "bold",
												}}
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
												style={{
													display: "flex",
													justifyContent: "center",
													alignItems: "center",
												}}
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
													className="icon-button"
													onClick={() =>
														(window.location.href = `/settings/access-mgmnt/edit/${item.id}`)
													}
												>
													<FaUserEdit
														style={{
															fontSize: "1.25rem", // Adjust the size of the icon if needed
															cursor: "pointer",
														}}
													/>
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
	);
}
