import 'dotenv/config';

import * as p from '@clack/prompts';
import pc from 'picocolors';
import postgres from 'postgres';

type DbInfo = {
	db: string;
	user: string;
	host: string | null;
	port: number | null;
	ssl: string | null;
};

async function getDbInfo(sql: postgres.Sql): Promise<DbInfo> {
	const [row] = await sql<DbInfo[]>`
		select
			current_database() as db,
			current_user as user,
			inet_server_addr()::text as host,
			inet_server_port() as port,
			current_setting('ssl', true) as ssl
	`;
	return row;
}

async function main() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		const info = await getDbInfo(sql);
		const target = `${info.user}@${info.host ?? '?'}:${info.port ?? '?'} / ${info.db}`;
		p.intro(pc.yellow('Postgres reset'));
		p.note(
			[
				`${pc.bold('Target:')} ${pc.white(target)}`,
				`${pc.bold('Schemas:')} ${pc.white('cards, drizzle_cards')}`,
				pc.red(pc.bold('THIS WILL DELETE ALL DATA IN THOSE SCHEMAS.'))
			].join('\n'),
			'Danger'
		);

		const confirm = await p.confirm({ message: 'Continue?', initialValue: false });
		if (p.isCancel(confirm) || !confirm) throw new Error('Canceled');

		await sql.begin(async (tx) => {
			await tx`drop schema if exists cards cascade`;
			await tx`drop schema if exists drizzle_cards cascade`;
		});

		p.outro(pc.green('Database reset complete.'));
		console.log(pc.green('Dropped & recreated schemas:'), pc.white(pc.bold('cards, drizzle_cards')));
		console.log(pc.yellow('Next:'), pc.white(pc.bold('run migrations (db:migrate)')));
	} finally {
		await sql.end({ timeout: 2 });
	}
}

main().catch((e) => {
	const msg = e instanceof Error ? e.message : String(e);
	if (msg === 'Canceled') {
		p.cancel('Canceled. No changes were made.');
		process.exitCode = 0;
		return;
	}
	console.error(pc.red(pc.bold(msg)));
	process.exitCode = 1;
});
