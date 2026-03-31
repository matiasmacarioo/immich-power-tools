import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const stmt = localDb.prepare('SELECT * FROM blocked_suggestions');
      const records = stmt.all();
      return res.status(200).json(records);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { person1Id, person2Id, relationshipType } = req.body;
      if (!person1Id || !person2Id) {
        return res.status(400).json({ error: 'Missing required person IDs' });
      }
      
      // Check if it already exists
      const checkStmt = localDb.prepare('SELECT id FROM blocked_suggestions WHERE (person1Id = ? AND person2Id = ?) OR (person1Id = ? AND person2Id = ?)');
      const existing = checkStmt.get(person1Id, person2Id, person2Id, person1Id);
      
      if (existing) {
        return res.status(200).json(existing);
      }

      const id = crypto.randomUUID();
      const stmt = localDb.prepare('INSERT INTO blocked_suggestions (id, person1Id, person2Id, relationshipType) VALUES (?, ?, ?, ?)');
      stmt.run(id, person1Id, person2Id, relationshipType || null);
      
      return res.status(201).json({ id, person1Id, person2Id, relationshipType });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
