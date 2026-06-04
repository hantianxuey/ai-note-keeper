import pool from './database';
import { applyPendingMigrations, rollbackLastMigration } from './migrationRunner';

async function main() {
  const command = process.argv[2] || 'up';

  if (command === 'up') {
    const applied = await applyPendingMigrations();
    console.log(applied.length > 0
      ? `Applied migrations: ${applied.join(', ')}`
      : 'Database schema is up to date.');
    return;
  }

  if (command === 'down') {
    const rolledBack = await rollbackLastMigration();
    console.log(rolledBack ? `Rolled back migration: ${rolledBack}` : 'No migrations to roll back.');
    return;
  }

  throw new Error(`Unknown migration command: ${command}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
