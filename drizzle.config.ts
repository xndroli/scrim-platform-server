import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
    schema: "./src/db/schema.ts",
    out: "./migrations",
    dialect: "postgresql",
    driver: 'pg',
    dbCredentials: {
        connectionString: process.env.DATABASE_URL!,
    },
} satisfies Config;
