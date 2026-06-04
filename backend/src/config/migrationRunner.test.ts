import { describe, expect, it, vi } from 'vitest';
import { applyPendingMigrations, collectSqlMigrations, rollbackLastMigration } from './migrationRunner';

const migration = {
  version: '001',
  name: 'initial_schema',
  upSql: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
  downSql: 'DROP TABLE users;',
};

describe('collectSqlMigrations', () => {
  it('pairs up and down SQL files into ordered migrations', () => {
    const migrations = collectSqlMigrations([
      { name: '002_add_index.down.sql', sql: 'DROP INDEX idx_notes_user_id;' },
      { name: '001_initial_schema.up.sql', sql: 'CREATE TABLE users (id SERIAL PRIMARY KEY);' },
      { name: '002_add_index.up.sql', sql: 'CREATE INDEX idx_notes_user_id ON notes(user_id);' },
      { name: '001_initial_schema.down.sql', sql: 'DROP TABLE users;' },
    ]);

    expect(migrations.map((item) => item.version)).toEqual(['001', '002']);
    expect(migrations[0]).toEqual(migration);
  });
});

describe('applyPendingMigrations', () => {
  it('applies migrations that are not recorded yet', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });

    await applyPendingMigrations({ query } as any, [migration]);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'));
    expect(query).toHaveBeenCalledWith('BEGIN');
    expect(query).toHaveBeenCalledWith(migration.upSql);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      [migration.version, migration.name]
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
  });
});

describe('rollbackLastMigration', () => {
  it('rolls back the latest recorded migration', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ version: '001' }] })
      .mockResolvedValue({ rows: [] });

    await rollbackLastMigration({ query } as any, [migration]);

    expect(query).toHaveBeenCalledWith('BEGIN');
    expect(query).toHaveBeenCalledWith(migration.downSql);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM schema_migrations'),
      [migration.version]
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
  });
});
