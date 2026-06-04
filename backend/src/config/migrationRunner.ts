import fs from 'fs';
import path from 'path';
import pool from './database';

export interface SqlMigration {
  version: string;
  name: string;
  upSql: string;
  downSql: string;
}

interface SqlFile {
  name: string;
  sql: string;
}

interface DatabaseClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`;

export function collectSqlMigrations(files: SqlFile[]): SqlMigration[] {
  const grouped = new Map<string, Partial<SqlMigration>>();

  for (const file of files) {
    const match = file.name.match(/^(\d+)_(.+)\.(up|down)\.sql$/);
    if (!match) continue;

    const [, version, name, direction] = match;
    const current = grouped.get(version) || { version, name };
    if (direction === 'up') {
      current.upSql = file.sql;
    } else {
      current.downSql = file.sql;
    }
    grouped.set(version, current);
  }

  return Array.from(grouped.values())
    .filter((migration): migration is SqlMigration => Boolean(
      migration.version && migration.name && migration.upSql && migration.downSql
    ))
    .sort((a, b) => a.version.localeCompare(b.version));
}

export function loadSqlMigrations(migrationsDir = path.resolve(__dirname, '../../migrations')): SqlMigration[] {
  const files = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => ({
      name,
      sql: fs.readFileSync(path.join(migrationsDir, name), 'utf8').trim(),
    }));

  return collectSqlMigrations(files);
}

async function ensureMigrationTable(db: DatabaseClient): Promise<void> {
  await db.query(MIGRATION_TABLE_SQL);
}

async function getAppliedVersions(db: DatabaseClient): Promise<Set<string>> {
  const result = await db.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(result.rows.map((row) => row.version));
}

export async function applyPendingMigrations(
  db: DatabaseClient = pool,
  migrations = loadSqlMigrations()
): Promise<string[]> {
  await ensureMigrationTable(db);
  const applied = await getAppliedVersions(db);
  const pending = migrations.filter((migration) => !applied.has(migration.version));
  const appliedNow: string[] = [];

  for (const migration of pending) {
    await db.query('BEGIN');
    try {
      await db.query(migration.upSql);
      await db.query(
        `INSERT INTO schema_migrations (version, name)
         VALUES ($1, $2)`,
        [migration.version, migration.name]
      );
      await db.query('COMMIT');
      appliedNow.push(migration.version);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  return appliedNow;
}

export async function rollbackLastMigration(
  db: DatabaseClient = pool,
  migrations = loadSqlMigrations()
): Promise<string | null> {
  await ensureMigrationTable(db);
  const result = await db.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
  const latestVersion = result.rows[0]?.version;
  if (!latestVersion) return null;

  const migration = migrations.find((item) => item.version === latestVersion);
  if (!migration) {
    throw new Error(`Missing migration file for applied version ${latestVersion}`);
  }

  await db.query('BEGIN');
  try {
    await db.query(migration.downSql);
    await db.query('DELETE FROM schema_migrations WHERE version = $1', [migration.version]);
    await db.query('COMMIT');
    return migration.version;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
