import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { redisClient, isRedisConnected } from '../config/redis';

// Fallback in-memory set to keep track of online user IDs when Redis is disconnected
export const inMemoryOnlineUsers = new Set<string>();

export async function getOnlineUsers(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (redisClient && isRedisConnected) {
      // Query Redis set for online user IDs
      const onlineUserIds = await redisClient.smembers('online_users');
      res.status(200).json(onlineUserIds);
    } else {
      // Query in-memory set fallback
      res.status(200).json(Array.from(inMemoryOnlineUsers));
    }
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
