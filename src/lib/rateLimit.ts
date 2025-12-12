// src/lib/rateLimit.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// 5 requests / 15 minutes per key
const redis = Redis.fromEnv();

export const rlForgotPasswordByIp = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:forgot:ip",
});

export const rlForgotPasswordByEmail = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:forgot:email",
});
