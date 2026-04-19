import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL!;
const urlObj = new URL(databaseUrl);

const requiresSsl = process.env.DB_REQUIRE_SSL === 'true';

if (requiresSsl) {
  urlObj.searchParams.set('sslmode', 'no-verify');
}


const sanitizedLog = urlObj.toString().replace(/:([^:@]+)@/, ':****@');
console.log(`[Drizzle Config] Using sanitized URL: ${sanitizedLog}`);

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: urlObj.toString(),
  },
});
