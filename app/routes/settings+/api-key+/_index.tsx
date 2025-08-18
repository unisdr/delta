import { Link, useLoaderData } from "@remix-run/react";

import { apiKeyTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { createPaginatedLoader } from "~/backend.server/handlers/view";

import { desc, eq } from "drizzle-orm";
import { DataMainLinks } from "~/frontend/data_screen";
import { MainContainer } from "~/frontend/container";
import { Pagination } from "~/frontend/pagination/view";

import { ActionLinks } from "~/frontend/form";

import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { route } from "~/frontend/api_key";
import { formatDate } from "~/util/date";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { ApiSecurityAudit, TokenAssignmentParser } from "~/backend.server/models/api_key";

// Define interface for enhanced API key with status information
interface EnhancedApiKey {
	id: string;
	name: string;
	createdAt: Date;
	managedByUserId: string;
	managedByUser: { email: string };
	assignedUserId?: string | null;
	cleanName?: string;
	isActive: boolean;
	tokenType?: 'user_assigned' | 'admin_managed';
	issues: string[];
}

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createPaginatedLoader(async (offsetLimit) => {
		// Fetch API keys with user information
		const keys = await dr.query.apiKeyTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				createdAt: true,
				name: true,
				managedByUserId: true,
			},
			where: eq(apiKeyTable.countryAccountsId, countryAccountsId),
			orderBy: [desc(apiKeyTable.name)],
			with: {
				managedByUser: true,
			},
		});

		// Enhance keys with status information
		const enhancedKeys = await Promise.all(keys.map(async (key) => {
			// Get complete key data first to ensure all required properties are available
			const completeKey = await dr.query.apiKeyTable.findFirst({
				where: eq(apiKeyTable.id, key.id),
				with: {
					managedByUser: true
				}
			});

			if (!completeKey) {
				// Create a default enhanced key if complete key not found
				return {
					...key,
					assignedUserId: null,
					cleanName: key.name,
					isActive: false,
					tokenType: 'admin_managed' as const,
					issues: ['Key data incomplete']
				} as EnhancedApiKey;
			}

			// Get token assignment and validation status
			const auditResult = await ApiSecurityAudit.auditSingleKeyEnhanced(completeKey);
			const assignment = TokenAssignmentParser.getTokenAssignment(completeKey);

			// Return properly typed enhanced key
			return {
				...key,
				assignedUserId: assignment.assignedUserId,
				cleanName: assignment.cleanName,
				isActive: auditResult.issues.length === 0,
				tokenType: assignment.isUserAssigned ? 'user_assigned' : 'admin_managed',
				issues: auditResult.issues
			} as EnhancedApiKey;
		}));

		return enhancedKeys as EnhancedApiKey[];
	}, await dr.$count(apiKeyTable, eq(apiKeyTable.countryAccountsId, countryAccountsId)))(
		args
	);
};

// Define a custom interface for our ApiKeyDataScreen props
interface ApiKeyDataScreenProps {
	plural: string;
	isPublic?: boolean;
	resourceName: string;
	baseRoute: string;
	searchParams?: URLSearchParams;
	columns: string[];
	items: EnhancedApiKey[];
	paginationData: any;
	renderRow: (item: EnhancedApiKey, baseRoute: string) => React.ReactNode;
	csvExportLinks?: boolean;
	headerElement?: React.ReactNode;
	beforeListElement?: React.ReactNode;
	hideMainLinks?: boolean
}

// Custom component that wraps DataScreen but hides the status legend
function ApiKeyDataScreen(props: ApiKeyDataScreenProps) {
	const pagination = Pagination(props.paginationData);
	return (
		<MainContainer title={props.plural}>
			<>
				{props.headerElement}
				<DataMainLinks
					searchParams={props.searchParams}
					isPublic={false}
					baseRoute={props.baseRoute}
					resourceName={props.resourceName}
					csvExportLinks={props.csvExportLinks}
				/>
				{props.beforeListElement}
				{props.paginationData.totalItems ? (
					<>
						{/* Status legend is intentionally removed here */}
						<table className="dts-table">
							<thead>
								<tr>
									{props.columns.map((col, index) => (
										<th key={index}>{col}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{props.items.map((item) =>
									props.renderRow(item, props.baseRoute)
								)}
							</tbody>
						</table>
						{pagination}
					</>
				) : (
					`No data found`
				)}
			</>
		</MainContainer>
	);
}

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { items, pagination } = ld.data;
	return ApiKeyDataScreen({
		plural: "API keys",
		resourceName: "API key",
		baseRoute: route,
		columns: ["ID", "Created at", "Managed by", "Key Name", "Status", "Actions"],
		items: items as EnhancedApiKey[],
		paginationData: pagination,
		renderRow: (item: EnhancedApiKey, route: string) => {
			// Determine status display
			const statusStyle = item.isActive
				? { color: 'green', fontWeight: 'bold' }
				: { color: 'red', fontWeight: 'bold' };
			const statusText = item.isActive ? 'Active' : 'Disabled';

			// Show assigned user if applicable
			const displayName = item.cleanName || item.name;
			const assignmentInfo = item.assignedUserId
				? ` (Assigned to user: ${item.assignedUserId})`
				: '';

			return (
				<tr key={item.id}>
					<td>
						<Link to={`${route}/${item.id}`}>{item.id}</Link>
					</td>
					<td>{formatDate(item.createdAt)}</td>
					<td>{item.managedByUser.email}</td>
					<td title={item.issues.join('\n')}>{displayName}{assignmentInfo}</td>
					<td>
						<span style={statusStyle}>{statusText}</span>
					</td>
					<td>
						<ActionLinks route={route} id={item.id} />
					</td>
				</tr>
			);
		},
	});
}
