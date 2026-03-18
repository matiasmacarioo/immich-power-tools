import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const stmt = localDb.prepare('SELECT * FROM relationships');
      const records = stmt.all();
      return res.status(200).json(records);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { person1Id, person2Id, relationshipType } = req.body;
      if (!person1Id || !person2Id || !relationshipType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const id = crypto.randomUUID();
      const stmt = localDb.prepare('INSERT INTO relationships (id, person1Id, person2Id, relationshipType) VALUES (?, ?, ?, ?)');
      stmt.run(id, person1Id, person2Id, relationshipType);
      return res.status(201).json({ id, person1Id, person2Id, relationshipType });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
