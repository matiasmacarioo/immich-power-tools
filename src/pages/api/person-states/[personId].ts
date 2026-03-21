import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { personId } = req.query as { personId: string };

  if (req.method === 'GET') {
    try {
      const row = localDb.prepare('SELECT personId, isDeceased, alias FROM person_states WHERE personId = ?').get(personId) as any;
      return res.status(200).json(row ? { ...row, isDeceased: !!row.isDeceased } : { personId, isDeceased: false, alias: null });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { isDeceased, alias } = req.body as { isDeceased?: boolean, alias?: string | null };
      
      // Get current values if not provided
      const current = localDb.prepare('SELECT isDeceased, alias FROM person_states WHERE personId = ?').get(personId) as any;
      const finalDeceased = isDeceased !== undefined ? (isDeceased ? 1 : 0) : (current?.isDeceased ?? 0);
      const finalAlias = alias !== undefined ? alias : (current?.alias ?? null);

      localDb.prepare(`
        INSERT INTO person_states (personId, isDeceased, alias)
        VALUES (?, ?, ?)
        ON CONFLICT(personId) DO UPDATE SET 
          isDeceased = excluded.isDeceased, 
          alias = excluded.alias,
          updatedAt = CURRENT_TIMESTAMP
      `).run(personId, finalDeceased, finalAlias);
      return res.status(200).json({ personId, isDeceased: !!finalDeceased, alias: finalAlias });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
