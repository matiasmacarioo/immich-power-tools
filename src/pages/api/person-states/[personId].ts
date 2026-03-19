import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { personId } = req.query as { personId: string };

  if (req.method === 'GET') {
    try {
      const row = localDb.prepare('SELECT personId, isDeceased FROM person_states WHERE personId = ?').get(personId);
      return res.status(200).json(row ?? { personId, isDeceased: 0 });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { isDeceased } = req.body as { isDeceased: boolean };
      localDb.prepare(`
        INSERT INTO person_states (personId, isDeceased)
        VALUES (?, ?)
        ON CONFLICT(personId) DO UPDATE SET isDeceased = excluded.isDeceased, updatedAt = CURRENT_TIMESTAMP
      `).run(personId, isDeceased ? 1 : 0);
      return res.status(200).json({ personId, isDeceased });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
