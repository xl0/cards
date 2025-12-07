import { Database } from 'bun:sqlite';
import { config } from 'dotenv';

config({ path: '.env' });

const sqlitePath = process.env.SQLITE_PATH ?? './sqlite/dev.db';
const db = new Database(sqlitePath, { create: true });

db.transaction(() => {
	db.run('PRAGMA foreign_keys = OFF');
	const tables = db
		.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';")
		.all() as { name: string }[];
	for (const { name } of tables) db.run(`DROP TABLE IF EXISTS "${name}"`);
	db.run('PRAGMA foreign_keys = ON');
})();

db.close();

console.log(`Database reset complete at ${sqlitePath}`);
