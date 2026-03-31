import { db } from "@/config/db";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import { sql } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const currentUser = await getCurrentUser(req);
        
        const query = sql.raw(`
            SELECT 
                CASE 
                    WHEN (af."boundingBoxX2" - af."boundingBoxX1") * (af."boundingBoxY2" - af."boundingBoxY1")::float / NULLIF(af."imageWidth" * af."imageHeight", 0) > 0.05 THEN 'Close-up / Portrait'
                    WHEN (af."boundingBoxX2" - af."boundingBoxX1") * (af."boundingBoxY2" - af."boundingBoxY1")::float / NULLIF(af."imageWidth" * af."imageHeight", 0) > 0.015 THEN 'Medium Distance'
                    ELSE 'Far / Background'
                END as label,
                COUNT(*) as count
            FROM asset_face af
            JOIN asset a ON af."assetId" = a.id
            WHERE a."ownerId" = '${currentUser.id}'
              AND af."imageWidth" > 0 AND af."imageHeight" > 0
            GROUP BY label
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
