import { eq } from "drizzle-orm";
import { dr } from "../../db.server";
import { User, userTable } from "../../drizzle/schema";

export async function getUserById(id: number): Promise<User | null> {
    const result = await dr
        .select()
        .from(userTable)
        .where(eq(userTable.id, id))
        .execute();
    return result[0] || null;
}
