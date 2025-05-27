import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
    out: "./migrations",
    dialect: "postgresql",
    schema: "./src/db/schema",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    // Better-auth specific configuration
    migrations: {
        prefix: 'timestamp'
    }
});