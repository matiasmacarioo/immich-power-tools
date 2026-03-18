import { NextApiRequest, NextApiResponse } from 'next';
import { localDb } from '@/config/localDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const data = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Expected an array of relationships' });
      }
      
      const insert = localDb.prepare('INSERT OR REPLACE INTO relationships (id, person1Id, person2Id, relationshipType, createdAt) VALUES (?, ?, ?, ?, ?)');
      
      const insertMany = localDb.transaction((relationships: any[]) => {
        for (const rel of relationships) {
          // If createdAt is missing or invalid, generate one
          const createdAt = rel.createdAt || new Date().toISOString();
          insert.run(rel.id, rel.person1Id, rel.person2Id, rel.relationshipType, createdAt);
        }
      });
      
      insertMany(data);
      return res.status(200).json({ success: true, count: data.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
