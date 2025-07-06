import { createClient } from "redis";
import dotenv from 'dotenv';

dotenv.config();

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on('error', (err) => console.log('Redis error ', err));

await redis.connect();

console.log('Redis client connected.');

export default redis;
