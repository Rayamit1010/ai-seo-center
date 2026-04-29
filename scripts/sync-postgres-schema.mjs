import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const sqliteSchemaPath = resolve(root, "prisma/schema.prisma");
const postgresSchemaPath = resolve(root, "prisma/schema.postgres.prisma");

const sqliteSchema = readFileSync(sqliteSchemaPath, "utf8");
const postgresSchema = sqliteSchema
  .replace(
    /generator\s+client\s*{\s*provider\s*=\s*"prisma-client-js"\s*}/m,
    'generator client {\n  provider = "prisma-client-js"\n  output   = "../generated/postgres-client"\n}'
  )
  .replace(
    /datasource\s+db\s*{\s*provider\s*=\s*"sqlite"/m,
    'datasource db {\n  provider = "postgresql"'
  );

if (postgresSchema === sqliteSchema) {
  throw new Error("Could not convert prisma/schema.prisma into a Postgres schema.");
}

writeFileSync(postgresSchemaPath, postgresSchema, "utf8");
console.log(`Synced ${postgresSchemaPath}`);
