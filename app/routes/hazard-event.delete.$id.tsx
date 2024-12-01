import {dr} from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	eventRelationshipTable,
	eventTable,
	hazardEventTable,
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
						.delete(hazardEventTable)
						.where(eq(hazardEventTable.id, String(id)));

					await tx
						.delete(eventRelationshipTable)
						.where(eq(eventRelationshipTable.childId, String(id)));

					await tx
						.delete(eventTable)
						.where(eq(eventTable.id, String(id)));

				})
			} catch (error: any) {
				if (
					error?.code === "23503" &&
					error?.message.includes("event_relationship_parent_id_event_id_fk")
				) {
					return {ok: false, "error": "Delete events that are caused by this event first"}
				} else {
					throw error;
				}
			}

			return {ok: true}
		},
		redirectToSuccess: () => "/hazard-event",
		redirectToError: (id) => `/hazard-event/${id}`
	})
})

