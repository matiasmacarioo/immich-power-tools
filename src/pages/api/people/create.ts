import { db } from "@/config/db";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import { person } from "@/schema";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const currentUser = await getCurrentUser(req);
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    const id = uuidv4();
    const [newPerson] = await db
      .insert(person)
      .values({
        id,
        ownerId: currentUser.id,
        name,
        thumbnailPath: "",
        isHidden: false,
      })
      .returning();

    return res.status(201).json(newPerson);
  } catch (error: any) {
    res.status(500).json({
      error: error?.message,
    });
  }
}
