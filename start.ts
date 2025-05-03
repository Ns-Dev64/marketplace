import { getRedisClient, getPrismaClient } from "./database/init";

export const start = {
  async startAll() {
    try {
      await Promise.all([
        getRedisClient(),
        getPrismaClient()
      ]);
      console.log("✅ Initialized DB and cache");

      
    } catch (e) {
      console.error("❌ Error occurred while connecting:", e);
    }
  }
}
