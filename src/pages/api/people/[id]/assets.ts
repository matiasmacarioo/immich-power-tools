import { NextApiRequest, NextApiResponse } from "next";

import { db } from "@/config/db";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import { and, asc, eq } from "drizzle-orm";
import { assets } from "@/schema/assets.schema";
import { assetFaces, exif } from "@/schema";
import { isFlipped } from "@/helpers/asset.helper";
import { ASSET_VIDEO_PATH } from "@/config/routes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id, page = 1, sort = 'date-desc' } = req.query as { id?: string; page?: number; sort?: string };

    if (!id) {
      return res.status(400).json({ error: "Person id is required" });
    }

    const dbAssets = await db
      .selectDistinctOn([assets.id], {
        id: assets.id,
        deviceId: assets.deviceId,
        type: assets.type,
        originalPath: assets.originalPath,
        isFavorite: assets.isFavorite,
        duration: assets.duration,
        originalFileName: assets.originalFileName,
        deletedAt: assets.deletedAt,
        localDateTime: assets.localDateTime,
        exifImageWidth: exif.exifImageWidth,
        exifImageHeight: exif.exifImageHeight,
        ownerId: assets.ownerId,
        dateTimeOriginal: exif.dateTimeOriginal,
        orientation: exif.orientation,
      })
      .from(assetFaces)
      .leftJoin(assets, eq(assetFaces.assetId, assets.id))
      .leftJoin(exif, eq(assets.id, exif.assetId))
      .where(
        and(
          eq(assetFaces.personId, id),
          eq(assets.visibility, "timeline"),
          eq(assets.status, "active"),
          eq(assets.ownerId, currentUser.id),
        )
      )
      // MUST start with the DISTINCT ON column (assets.id) to satisfy PostgreSQL's constraint
      .orderBy(asc(assets.id))
      .limit(100)
      .offset(100 * (Number(page) - 1));

    const cleanedAssets = dbAssets
      .map((asset) => ({
        ...asset,
        exifImageHeight: isFlipped(asset?.orientation)
          ? asset?.exifImageWidth
          : asset?.exifImageHeight,
        exifImageWidth: isFlipped(asset?.orientation)
          ? asset?.exifImageHeight
          : asset?.exifImageWidth,
        orientation: asset?.orientation,
        downloadUrl: asset?.id ? ASSET_VIDEO_PATH(asset.id) : null,
      }))
      .sort((a, b) => {
        if (sort === 'date-desc') {
          return new Date(b.localDateTime || 0).getTime() - new Date(a.localDateTime || 0).getTime();
        } else if (sort === 'name') {
          return (a.originalFileName || '').localeCompare(b.originalFileName || '');
        }
        // date-asc (default)
        return new Date(a.localDateTime || 0).getTime() - new Date(b.localDateTime || 0).getTime();
      });

    return res.status(200).json(cleanedAssets);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message });
  }
}
