import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { personId } = req.query as { personId: string };

  if (req.method === 'GET') {
    try {
      const row = localDb.prepare('SELECT personId, isDeceased, alias, deathDate, gender FROM person_states WHERE personId = ?').get(personId) as any;
      return res.status(200).json(row ? { ...row, isDeceased: !!row.isDeceased } : { personId, isDeceased: false, alias: null, deathDate: null, gender: null });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { isDeceased, alias, deathDate, gender } = req.body as { isDeceased?: boolean, alias?: string | null, deathDate?: string | null, gender?: string | null };
      
      // Get current values if not provided
      const current = localDb.prepare('SELECT isDeceased, alias, deathDate, gender FROM person_states WHERE personId = ?').get(personId) as any;
      const finalDeceased = isDeceased !== undefined ? (isDeceased ? 1 : 0) : (current?.isDeceased ?? 0);
      const finalAlias = alias !== undefined ? alias : (current?.alias ?? null);
      const finalDeathDate = deathDate !== undefined ? deathDate : (current?.deathDate ?? null);
      const finalGender = gender !== undefined ? gender : (current?.gender ?? null);

      localDb.prepare(`
        INSERT INTO person_states (personId, isDeceased, alias, deathDate, gender)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(personId) DO UPDATE SET 
          isDeceased = excluded.isDeceased, 
          alias = excluded.alias,
          deathDate = excluded.deathDate,
          gender = excluded.gender,
          updatedAt = CURRENT_TIMESTAMP
      `).run(personId, finalDeceased, finalAlias, finalDeathDate, finalGender);
      return res.status(200).json({ personId, isDeceased: !!finalDeceased, alias: finalAlias, deathDate: finalDeathDate, gender: finalGender });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
