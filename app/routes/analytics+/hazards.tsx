import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLoaderData } from "@remix-run/react";
import HazardFilters from "~/frontend/analytics/hazards/sections/HazardFilters";

// Create QueryClient instance
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			staleTime: 5 * 60 * 1000, // 5 minutes
		},
	},
});

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs: any) => {
		// Get currency from environment variable
		const currency = process.env.CURRENCY_CODES?.split(",")[0] || "PHP";

		return Response.json({
			currency,
			loaderArgs,
		});
	}
);

function HazardAnalysisContent() {
	const { currency } = useLoaderData<typeof loader>();

	const [filters, setFilters] = useState<{
		hazardTypeId: string | null;
		hazardClusterId: string | null;
		specificHazardId: string | null;
		geographicLevelId: string | null;
		fromDate: string | null;
		toDate: string | null;
	} | null>(null);

	// Event handlers for Filters component
	const handleApplyFilters = (newFilters: typeof filters) => {
		setFilters(newFilters);
	};

	const handleAdvancedSearch = () => {
		// TODO: Implement advanced search functionality
		console.log("Advanced search clicked");
	};

	const handleClearFilters = () => {
		setFilters(null);
	};

	return (
		<MainContainer title="Hazards Analysis" headerExtra={<NavSettings />}>
			<div style={{ maxWidth: "100%", overflow: "hidden" }}>
				<div className="sectors-page">
					{/* Filters Section */}
					<HazardFilters
						onApplyFilters={handleApplyFilters}
						onAdvancedSearch={handleAdvancedSearch}
						onClearFilters={handleClearFilters}
					/>

					{/* Conditional rendering: Display this message until filters are applied */}
					{!filters && (
						<div
							style={{
								marginTop: "2rem",
								textAlign: "center",
								padding: "2rem",
								borderRadius: "8px",
								backgroundColor: "#f9f9f9",
								color: "#333",
								fontSize: "1.6rem",
								lineHeight: "1.8rem",
							}}
						>
							<h3
								style={{
									color: "#004f91",
									fontSize: "2rem",
									marginBottom: "1rem",
								}}
							>
								Welcome to the Hazard Dashboard! 🌟
							</h3>
							<p>Please select and apply filters above to view the analysis.</p>
						</div>
					)}
				</div>
			</div>
		</MainContainer>
	);
}

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
	return [
		{ title: "Hazards Analysis - DTS" },
		{ name: "description", content: "Hazards analysis page under DTS." },
	];
};

// Wrapper component that provides QueryClient
export default function HazardAnalysis() {
	console.log("query client = ", queryClient);
	return (
		<QueryClientProvider client={queryClient}>
			<HazardAnalysisContent />
		</QueryClientProvider>
	);
}
