import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth2 } from "~/backend.server/models/api_key";
import {
	getDivisionByCountryAccountsId,
	getDivisionCountByCountryAccountsId,
} from "~/db/queries/divisonTable";
import { getPaginationParams } from "~/frontend/pagination/api.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	try {
		const apiKey = await apiAuth2(request);
		const countryAccountsId = apiKey.managedByUser.countryAccountsId;

		// Extract pagination parameters from the request URL
		const { page, pageSize, offset } = getPaginationParams(request);

		// Get the data
		const data = await getDivisionByCountryAccountsId(
			countryAccountsId,
			offset,
			pageSize
		);

		//Get the total count for pagination metadata
		const totalCount = await getDivisionCountByCountryAccountsId(
			countryAccountsId
		);

		return Response.json({
			data,
			pagination: {
				page: page,
				pageSize: pageSize,
				totalItems: totalCount,
				totalPages: Math.ceil(totalCount / pageSize),
				itemsOnThisPage: data.length,
			},
		});
	} catch (error) {
		console.log(error);
		if (error instanceof Response) {
			const errorMessage = await error.text();
			return Response.json(
				{ errorMessge: errorMessage || "Unknown error" },
				{ status: error.status }
			);
		}

		// Handle non-Response errors
		return Response.json(
			{ errorMessge: "Internal server error" },
			{ status: 500 }
		);
	}
};

export const action = async () => {
	return Response.json(
		{ errorMessge: "Method not allowed, use GET" },
		{ status: 405 }
	);
};
