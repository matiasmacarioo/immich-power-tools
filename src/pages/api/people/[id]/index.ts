import { db } from "@/config/db";
import { localDb } from "@/config/localDb";
import { person } from "@/schema/person.schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const id = req.query.id as string;
        
        if (!id) {
            return res.status(400).json({ error: "ID is required" });
        }

        // Delete from local SQLite database
        const stmtRel = localDb.prepare('DELETE FROM relationships WHERE person1Id = ? OR person2Id = ?');
        stmtRel.run(id, id);

        const stmtState = localDb.prepare('DELETE FROM person_states WHERE personId = ?');
        stmtState.run(id);

        // Try deleting from Immich DB if it's a virtual person
        // If it throws an error (e.g. FK constraint because it's a real person), catch it.
        try {
            await db.delete(person).where(eq(person.id, id));
        } catch (e) {
            console.log(`Could not delete person ${id} from Immich DB (likely a real person with faces).`, e);
        }

        return res.status(200).json({ success: true });
    } catch (e: any) {
        console.error("Error deleting person local data:", e);
        return res.status(500).json({ error: e.message || "Failed to delete person" });
    }
}
