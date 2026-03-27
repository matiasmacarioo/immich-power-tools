import { localDb } from "@/config/localDb";
import { getCurrentUser } from "@/handlers/serverUtils/user.utils";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.query as { id: string };
  const { ids } = req.body as { ids: string[] };

  if (!ids || ids.length === 0) return res.status(400).end();

  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return res.status(401).end();

    // Update relationships locally
    for (const targetId of ids) {
      localDb.prepare('UPDATE relationships SET person1Id = ? WHERE person1Id = ?').run(id, targetId);
      localDb.prepare('UPDATE relationships SET person2Id = ? WHERE person2Id = ?').run(id, targetId);
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
