import { createApp } from "./app";
import { createPrismaClient, ensureDefaultDatabaseUrl } from "./db";
import { initializeDatabaseSchema } from "./schema";

async function main(): Promise<void> {
  ensureDefaultDatabaseUrl();
  const prisma = createPrismaClient();
  await initializeDatabaseSchema(prisma);
  const app = createApp({ prisma });
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 4317);

  try {
    await app.listen({ host, port });
    console.log(`Product Shot Studio 本地账本服务已启动：http://${host}:${port}`);
    console.log(`监测后台：http://${host}:${port}/admin`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log("开发默认后台密码：admin123456。正式使用前请在 server/.env 中修改 ADMIN_PASSWORD。");
    }
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
