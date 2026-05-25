import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

function getClient() {
	if (client) {
		return client;
	}

	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error(
			"No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?"
		);
	}

	client = neon(databaseUrl);
	return client;
}

export const sql: NeonQueryFunction<false, false> = ((
	strings: TemplateStringsArray,
	...values: unknown[]
) => getClient()(strings, ...values)) as NeonQueryFunction<false, false>;
