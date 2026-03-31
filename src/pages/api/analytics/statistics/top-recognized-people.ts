import { db } from "@/config/db";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import { sql } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const currentUser = await getCurrentUser(req);
        
        const query = sql.raw(`
            SELECT p.name as label, COUNT(af.id) as count
            FROM asset_face af
            JOIN asset a ON af."assetId" = a.id
            JOIN person p ON af."personId" = p.id
            WHERE a."ownerId" = '${currentUser.id}'
              AND p.name IS NOT NULL
              AND p.name != ''
              AND p.name != 'Unknown'
            GROUP BY p.id, p.name
            ORDER BY count DESC
            LIMIT 10
        `);
        
        const { rows } = await db.execute(query);
        const chartData = rows.map((r: any) => ({
            label: r.label,
            value: Number(r.count)
        }));
        
        return res.status(200).json(chartData);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
