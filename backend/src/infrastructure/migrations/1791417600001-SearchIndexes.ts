import { MigrationInterface, QueryRunner } from 'typeorm';
export class SearchIndexes1791417600001 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    for (const [table, columns] of Object.entries({
      records: ['code', 'title'],
      deposits: ['name'],
      users: ['name', 'email'],
      inspections: ['notes'],
      readings: ['sensorId'],
      alerts: ['message'],
      tasks: ['title'],
    }))
      for (const column of columns)
        await q.query(
          `CREATE INDEX "${table}_${column}_search_idx" ON "${table}" USING gin ("${column}" gin_trgm_ops)`,
        );
  }
  async down(q: QueryRunner): Promise<void> {
    for (const [table, columns] of Object.entries({
      records: ['code', 'title'],
      deposits: ['name'],
      users: ['name', 'email'],
      inspections: ['notes'],
      readings: ['sensorId'],
      alerts: ['message'],
      tasks: ['title'],
    }))
      for (const column of columns) await q.query(`DROP INDEX "${table}_${column}_search_idx"`);
  }
}
