import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

const execFileAsync = promisify(execFile);

async function runPrismaDbPush() {
  await execFileAsync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: process.cwd(),
    shell: true,
  });
}

async function generateSchemaSql() {
  const result = await execFileAsync(
    'npx',
    ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'],
    {
      cwd: process.cwd(),
      shell: true,
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  return result.stdout;
}

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Only SQLite file DATABASE_URL values are supported by the fallback db:push script.');
  }

  const relativePath = databaseUrl.replace(/^file:/, '');
  return path.resolve(process.cwd(), 'prisma', relativePath);
}

async function main() {
  try {
    await runPrismaDbPush();
    console.log('Prisma db push completed successfully.');
    return;
  } catch (error) {
    const databasePath = resolveDatabasePath();

    if (fs.existsSync(databasePath)) {
      throw error;
    }

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const sql = await generateSchemaSql();
    const database = new DatabaseSync(databasePath);

    try {
      database.exec(sql);
      console.log(`Initialized SQLite database at ${databasePath} from Prisma schema diff fallback.`);
    } finally {
      database.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
