import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const stmt = localDb.prepare('SELECT * FROM relationships');
      const records = stmt.all();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="relationships.json"');
      return res.status(200).json(records);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
