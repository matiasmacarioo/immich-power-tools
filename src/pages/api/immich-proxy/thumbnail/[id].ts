// pages/api/proxy.js

import { ENV } from '@/config/environment';
import { getCurrentUser } from '@/handlers/serverUtils/user.utils';
import { getUserHeaders } from '@/helpers/user.helper';
import { NextApiRequest, NextApiResponse } from 'next'
import { localDb } from '@/config/localDb';

import { getFakeAvatar } from '@/helpers/person.helper';

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }
  
  const { id } = req.query;
  const targetUrl = `${ENV.IMMICH_URL}/api/people/${id}/thumbnail`;

  const currentUser = await getCurrentUser(req);

  if (!currentUser) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  try {
    // Forward the request to the target API
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: getUserHeaders(currentUser, {
        'Content-Type': 'application/octet-stream',
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Get the image data from the response
    const imageBuffer = await response.arrayBuffer()

    // Set the appropriate headers for the image response
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/png')
    res.setHeader('Content-Length', imageBuffer.byteLength)

    // Send the image data
    res.send(Buffer.from(imageBuffer))
  } catch (error) {
    try {
      const state = localDb.prepare('SELECT gender FROM person_states WHERE personId = ?').get(id) as any;
      const gender = state?.gender;
      const fakeAvatar = getFakeAvatar(gender);
      const base64Data = fakeAvatar.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Length', buffer.byteLength);
      return res.send(buffer);
    } catch (e) {
      console.error('Failed to get local state for fallback avatar', e);
      const fallback = getFakeAvatar(null);
      const base64Data = fallback.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Length', buffer.byteLength);
      return res.send(buffer);
    }
  }
}