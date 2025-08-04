import {
	Link,
	MetaFunction,
	useLoaderData,
	useNavigate,
} from "@remix-run/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getUserCountryAccountsWithUserByCountryAccountsId } from "~/db/queries/userCountryAccounts";
import { MainContainer } from "~/frontend/container";
import {
	paginationQueryFromURL,
} from "~/frontend/pagination/api.server";
import { Pagination } from "~/frontend/pagination/view";
import { NavSettings } from "~/routes/settings/nav";
import { authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

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

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const pagination = paginationQueryFromURL(request, []);

	const items = await getUserCountryAccountsWithUserByCountryAccountsId(
		pagination.query.skip,
		pagination.query.take,
		countryAccountsId
	);

	return {
		...items,
		search,
	};
});

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
	const [filteredItems, setFilteredItems] = useState(items);
	const [organizationFilter, setOrganizationFilter] = useState("");
	const [roleFilter, setRoleFilter] = useState("");

	// Dynamically calculate pagination
	const pagination = Pagination({
		itemsOnThisPage: filteredItems.length,
		totalItems: ld.pagination.total,
		page: ld.pagination.pageNumber,
		pageSize: ld.pagination.pageSize,
		extraParams:ld.pagination.extraParams, 
	});

	const handleOrganizationFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.toLowerCase();
		setOrganizationFilter(value);
		setFilteredItems(
			items.filter((item) =>
				item.user.organization.toLowerCase().includes(value)
			)
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
		return item.user.emailVerified === true;
	}).length;

	const pendingUsers = filteredItems.filter(
		(item) => !item.user.emailVerified
	).length;
	return (
		<MainContainer title="Access management" headerExtra={<NavSettings />}>
			<div className="dts-page-intro">
				<div className="dts-additional-actions">
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

			<div>
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
								<th>Email</th>
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
											className={`dts-access-management__status-dot ${
												item.user.emailVerified
													? "dts-access-management__status-dot--activated"
													: "dts-access-management__status-dot--pending"
											}`}
										>
											<span className="dts-access-management__tooltip-text">
												{item.user.emailVerified ? "Activated" : "Pending"}
											</span>
											<span className="dts-access-management__tooltip-pointer"></span>
										</span>
									</td>

									<td>
										<Link
											to={`/settings/access-mgmnt/edit/${item.user.id}`}
											className="link"
										>
											{item.user.firstName} {item.user.lastName}
										</Link>
									</td>
									<td>{item.user.email}</td>
									<td>{item.user.organization}</td>
									{/* Updated Role Column with Badge */}
									<td>
										<span>
											{item.role.charAt(0).toUpperCase() + item.role.slice(1)}{" "}
											{/* Capitalizes the first letter */}
										</span>
									</td>
									<td>{item.user.updatedAt && format(item.user.updatedAt, "dd-MM-yyyy")}</td>
									<td>
										<button
											aria-label={`Edit item ${item.user.id}`}
											className="mg-button mg-button-table"
											onClick={() =>
												navigate(`/settings/access-mgmnt/edit/${item.user.id}`)
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
