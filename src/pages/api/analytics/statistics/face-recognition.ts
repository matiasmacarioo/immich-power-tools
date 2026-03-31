// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { db } from "@/config/db";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import { assets } from "@/schema";
import { count, eq, sql } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        const currentUser = await getCurrentUser(req);

        // Count total photos to determine how many have NO faces
        const totalPhotosResult = await db.select({
            value: count(),
        })
        .from(assets)
        .where(eq(assets.ownerId, currentUser.id));
        const totalCount = totalPhotosResult[0]?.value || 0;

        // Count assets grouped by face counts
        const query = sql.raw(`
            WITH face_counts AS (
                SELECT af."assetId", COUNT(af.id) as face_count
                FROM asset_face af
                JOIN asset a ON af."assetId" = a.id
                WHERE a."ownerId" = '${currentUser.id}'
                GROUP BY af."assetId"
            )
            SELECT 
                CASE 
                    WHEN face_count = 1 THEN '1 Face'
                    WHEN face_count = 2 THEN '2 Faces'
                    WHEN face_count BETWEEN 3 AND 5 THEN '3-5 Faces'
                    ELSE '6+ Faces'
                END as label,
                COUNT(*) as count
            FROM face_counts
            GROUP BY label
        `);

        const { rows } = await db.execute(query);

        // Calculate assets without faces
        const assetsWithFaces = rows.reduce((acc: number, row: any) => acc + Number(row.count), 0);
        const withoutFacesCount = totalCount - assetsWithFaces;

        // Map results mapped to the chart data format
        const chartData = [
            { label: "No Faces", value: withoutFacesCount },
            ...rows.map((r: any) => ({
                label: r.label,
                value: Number(r.count)
            }))
        ];

        // Ensure chart data is beautifully sorted or explicitly ordered
        const desiredOrder = ["No Faces", "1 Face", "2 Faces", "3-5 Faces", "6+ Faces"];
        chartData.sort((a, b) => desiredOrder.indexOf(a.label) - desiredOrder.indexOf(b.label));

        return res.status(200).json(chartData);
    } catch (error: any) {
        res.status(500).json({
            error: error?.message,
        });
    }
}
