import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const stmt = localDb.prepare('SELECT * FROM vcard_uids');
      const records = stmt.all();
      return res.status(200).json(records);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { personId, uid } = req.body;
      if (!personId || !uid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const stmt = localDb.prepare('INSERT INTO vcard_uids (personId, uid, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(personId) DO UPDATE SET uid = excluded.uid, updatedAt = CURRENT_TIMESTAMP');
      stmt.run(personId, uid);
      
      return res.status(201).json({ personId, uid });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
