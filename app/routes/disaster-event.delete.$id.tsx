import {dr} from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	disasterEventTable,
	eventTable,
} from '~/drizzle/schema';

import {
	authLoaderWithRole,
} from "~/util/auth";

import {
	formDelete
} from "~/backend.server/components/form";

export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	return formDelete({
		loaderArgs: loaderArgs,
		deleteFn: async (id: any) => {
			try {
				await dr.transaction(async (tx) => {
					await tx
						.delete(disasterEventTable)
						.where(eq(disasterEventTable.id, String(id)));

					/*
				await tx
					.delete(eventRelationshipTable)
					.where(eq(eventRelationshipTable.childId, String(id)));
*/
					await tx
						.delete(eventTable)
						.where(eq(eventTable.id, String(id)));

				})
			} catch (error: any) {
				throw error;
			}

			return {ok: true}
		},
		redirectToSuccess: () => "/disaster-event",
		redirectToError: (id) => `/disaster-event/${id}`
	})
})

