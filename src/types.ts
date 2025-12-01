import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";

export type AppContext = {
    Variables: {
        db: NodePgDatabase<typeof schema>
        schema: typeof schema
    };
};