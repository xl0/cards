import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';

const sqlitePath = process.env.SQLITE_PATH ?? './sqlite/dev.db';
mkdirSync(dirname(sqlitePath), { recursive: true });

const sqlite = new Database(sqlitePath, { create: true });

export const db = drizzle({ client: sqlite, schema });
