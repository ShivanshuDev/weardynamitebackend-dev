"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.init();
    }
    init() {
        try {
            this.client = new ioredis_1.default(REDIS_URL, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        console.error('[REDIS ERROR] Max retries reached. Cache disabled.');
                        this.isConnected = false;
                        return null; // Stop retrying
                    }
                    return Math.min(times * 200, 2000);
                }
            });
            this.client.on('connect', () => {
                console.log('[REDIS] Connected to Cache Server');
                this.isConnected = true;
            });
            this.client.on('error', (err) => {
                console.error('[REDIS ERROR]', err.message);
                this.isConnected = false;
            });
        }
        catch (e) {
            console.error('[REDIS INIT ERROR]', e.message);
        }
    }
    async get(key) {
        if (!this.isConnected || !this.client)
            return null;
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            console.error(`[REDIS GET ERROR] ${key}:`, e);
            return null;
        }
    }
    async set(key, value, ttlSeconds = 3600) {
        if (!this.isConnected || !this.client)
            return;
        try {
            const data = JSON.stringify(value);
            await this.client.setex(key, ttlSeconds, data);
        }
        catch (e) {
            console.error(`[REDIS SET ERROR] ${key}:`, e);
        }
    }
    async del(key) {
        if (!this.isConnected || !this.client)
            return;
        try {
            await this.client.del(key);
        }
        catch (e) {
            console.error(`[REDIS DEL ERROR] ${key}:`, e);
        }
    }
    /**
     * Clear keys matching a pattern (e.g. products:list:*)
     */
    async delPattern(pattern) {
        if (!this.isConnected || !this.client)
            return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        }
        catch (e) {
            console.error(`[REDIS DELPATTERN ERROR] ${pattern}:`, e);
        }
    }
}
exports.cache = new RedisClient();
