// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { db } from "@/config/db";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import { assetFaces, assets, exif, person } from "@/schema";
import { localDb } from "@/config/localDb";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

type ISortField = "assetCount" | "updatedAt" | "createdAt" | "coOccurringNamed";

interface IQuery {
  page: number;
  perPage: number;
  type: string;
  maximumAssetCount: number;
  sort: ISortField;
  sortOrder: "asc" | "desc";
  query: string;
  visibility: "all" | "visible" | "hidden";
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const {
      page = 1,
      perPage = 60,
      maximumAssetCount: maxValue = 1000000,
      sort = "assetCount",
      sortOrder = "desc",
      type = "all",
      query = "",
      visibility = "all",
    } = req.query as any as IQuery;

    const currentUser = await getCurrentUser(req);

    const maximumAssetCount = !maxValue || maxValue <= 0 ? 1000000 : maxValue;

    const whereClause = and(
      or(
        isNull(assets.id),
        and(
          isNull(assets.duplicateId),
          eq(assets.visibility, "timeline"),
          eq(assets.status, "active"),
          eq(assets.ownerId, currentUser.id)
        )
      ),
      eq(person.ownerId, currentUser.id),
      type === "all" ? undefined : (type === "nameless" ? eq(person.name, "") : ne(person.name, "")),
      query && query.length > 0 ? ilike(person.name, `%${query}%`) : undefined,
      visibility === "visible" ? eq(person.isHidden, false) : visibility === "hidden" ? eq(person.isHidden, true) : undefined
    );

    let dbQuery = db
      .select({
        id: person.id,
        name: person.name,
        birthDate: person.birthDate,
        isHidden: person.isHidden,
        updatedAt: person.updatedAt,
        assetCount: count(assetFaces.id),
        coOccurringNamed: sql<number>`COALESCE(SUM((
          SELECT COUNT(af2.id)
          FROM "asset_face" af2
          JOIN "person" p2 ON af2."personId" = p2.id
          WHERE af2."assetId" = ${assetFaces.assetId}
            AND p2.id != ${person.id}
            AND p2.name != ''
        )), 0)`.as('coOccurringNamed'),
      })
      .from(person)
      .leftJoin(assetFaces, eq(assetFaces.personId, person.id))
      .leftJoin(assets, eq(assets.id, assetFaces.assetId))
      .where(whereClause)
      .having(lte(count(assetFaces.id), maximumAssetCount))
      .groupBy(person.id);

    let sortedQuery;
    if (sort === "assetCount") {
      sortedQuery = dbQuery.orderBy(
        sortOrder === "asc"
          ? asc(count(assetFaces.id))
          : desc(count(assetFaces.id))
      );
    } else if (sort === "updatedAt") {
      sortedQuery = dbQuery.orderBy(
        sortOrder === "asc" ? asc(person.updatedAt) : desc(person.updatedAt)
      );
    } else if (sort === "coOccurringNamed") {
      sortedQuery = dbQuery.orderBy(
        sortOrder === "asc"
          ? asc(sql`"coOccurringNamed"`)
          : desc(sql`"coOccurringNamed"`)
      );
    } else {
      sortedQuery = dbQuery;
    }
    const numPage = Number(page) || 1;
    const numPerPage = Number(perPage) || 60;
    const people = await dbQuery.limit(numPerPage).offset((numPage - 1) * numPerPage);

    // Enrich with local aliases and states
    const personIds = people.map(p => p.id);
    if (personIds.length > 0) {
      const placeholders = personIds.map(() => '?').join(',');
      const localStates = localDb.prepare(`SELECT personId, alias, isDeceased, deathDate, gender FROM person_states WHERE personId IN (${placeholders})`).all(...personIds) as any[];
      const stateMap = new Map(localStates.map(s => [s.personId, s]));
      
      people.forEach((p: any) => {
        const state = stateMap.get(p.id);
        p.alias = state?.alias || null;
        p.isDeceased = state?.isDeceased === 1;
        p.deathDate = state?.deathDate || null;
        p.gender = state?.gender || null;
      });
    }

    return res.status(200).json({
      people,
      total: 10,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message,
    });
  }
}
