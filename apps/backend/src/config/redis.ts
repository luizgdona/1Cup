import IORedis from 'ioredis';
import { env } from './env';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
