import { useLoaderData, Link, MetaFunction, useNavigate } from "@remix-run/react";
import { authLoaderWithPerm } from "~/util/auth";
import { Pagination } from "~/frontend/pagination/view";
import { executeQueryForPagination } from "~/frontend/pagination/api.server";
import { userTable } from "~/drizzle/schema";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { requireTenantContext } from "~/util/tenant";
import { and, eq, ne } from "drizzle-orm";
import { getUserFromSession } from "~/util/session";

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

	// Get user session and tenant context
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const tenantContext = await requireTenantContext(userSession);
	if (!tenantContext) {
		throw new Response("Unauthorized - No tenant context", { status: 401 });
	}

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

	// Add tenant filtering to only show users from the current tenant
	const where = and(
		eq(userTable.countryAccountsId, tenantContext.countryAccountId),
		ne(userTable.role, 'super_admin') // Don't show super admins in the list
	);

	const res = await executeQueryForPagination<UserRes>(
		request,
		userTable,
		select,
		where
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
	const { items } = ld;

	const [isClient, setIsClient] = useState(false);
	const navigate = useNavigate();

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
	return (
		<MainContainer title="Access management" headerExtra={<NavSettings />}>
			<div className="dts-page-intro">
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
			</div>

			{/* Add User Button */}
			<div className="dts-element-summary">
				<h2 className="dts-element-summary__title">
					<span>Currently there are [{totalUsers}] users in the system.</span>
				</h2>
			</div>

			{/* Filter Form */}
			<form method="get" className="dts-form">
				<div className="mg-grid mg-grid__col-3">
					{/* Organisation Filter */}
					<div className="dts-form-component">
						<label className="dts-form-component__label">
							Organisation
							<input
								type="search"
								name="organization"
								value={organizationFilter}
								placeholder="Type organisation name"
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
			<div>
				{/* Total User Count */}
				<div>
					<strong className="dts-body-label">
						{filteredItems.length} of {totalUsers} Users
					</strong>
				</div>

				{/* Status Legend */}
				<div className="dts-legend">
					<span className="dts-body-label">Status legend</span>

					<div className="dts-legend__item">
						<span
							className="dts-status dts-status--activated"
							aria-labelledby="legend7"
						></span>
						<span id="legend7">Account activated: {activatedUsers}</span>
					</div>

					<div className="dts-legend__item">
						<span aria-labelledby="legend8"></span>
						<span id="legend8">Account activation pending: {pendingUsers}</span>
					</div>
				</div>
			</div>

			{/* Users Table */}
			{isClient && (
				<div>
					<table className="dts-table">
						<thead>
							<tr>
								<th>Status</th>
								<th>Name</th>
								<th>Organisation</th>
								<th>Role</th>
								<th>Modified</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((item, index) => (
								<tr key={index}>
									<td>
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
										<span>
											{item.role.charAt(0).toUpperCase() + item.role.slice(1)}{" "}
											{/* Capitalizes the first letter */}
										</span>
									</td>
									<td>{format(item.modifiedAt, "dd-MM-yyyy")}</td>
									<td>
										<button
											aria-label={`Edit item ${item.id}`}
											className="mg-button mg-button-table"
											onClick={() => navigate(`/settings/access-mgmnt/edit/${item.id}`)}
										>
											<svg
												aria-hidden="true"
												focusable="false"
												role="img"
												style={{ marginLeft: "4px" }}
											>
												<use href="/assets/icons/edit.svg#edit"></use>
											</svg>
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{pagination}
		</MainContainer>
	);
}
