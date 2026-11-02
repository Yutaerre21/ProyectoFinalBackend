import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, EntityManager, ObjectLiteral } from 'typeorm';
import { BusinessError, ListQuery, Page, Table, Tables } from '../domain/model';
import { Repository } from '../domain/ports';
import { schemas } from './schema';
import { Initial1791417600000 } from './migrations/1791417600000-Initial';
import { SearchIndexes1791417600001 } from './migrations/1791417600001-SearchIndexes';
export function createDataSource() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: Object.values(schemas),
    migrations: [Initial1791417600000, SearchIndexes1791417600001],
    synchronize: false,
    logging: false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  });
}
const searchable: Partial<Record<Table, string[]>> = {
  records: ['code', 'title'],
  deposits: ['name'],
  users: ['name', 'email'],
  inspections: ['notes'],
  readings: ['sensorId'],
  alerts: ['message'],
  tasks: ['title'],
};
const sortable: Record<Table, string[]> = {
  users: ['createdAt', 'name', 'email', 'role'],
  sessions: ['createdAt'],
  deposits: ['createdAt', 'name'],
  records: ['createdAt', 'code', 'title', 'nextInspectionAt', 'condition'],
  inspections: ['createdAt', 'condition'],
  readings: ['createdAt', 'measuredAt', 'temperature', 'humidity'],
  alerts: ['createdAt', 'priority', 'status'],
  tasks: ['createdAt', 'dueAt', 'status', 'title'],
};
export class PgRepository implements Repository {
  constructor(
    private ds: DataSource,
    private manager: EntityManager = ds.manager,
    private insideTransaction = false,
  ) {}
  private repo(table: Table) {
    return this.manager.getRepository(schemas[table]);
  }
  // EntitySchema rows are explicitly copied to plain domain objects; ORM objects never escape.
  async get<K extends Table>(table: K, id: string): Promise<Tables[K] | null> {
    const row = await this.repo(table).findOneBy({ id });
    return row ? ({ ...row } as Tables[K]) : null;
  }
  async find<K extends Table>(table: K, where: Partial<Tables[K]>): Promise<Tables[K][]> {
    return (await this.repo(table).findBy(where as ObjectLiteral)).map(
      (row) => ({ ...row }) as Tables[K],
    );
  }
  async save<K extends Table>(table: K, value: Tables[K]): Promise<Tables[K]> {
    return { ...(await this.repo(table).save({ ...value })) } as Tables[K];
  }
  async remove<K extends Table>(table: K, id: string) {
    await this.repo(table).delete(id);
  }
  async list<K extends Table>(table: K, query: ListQuery): Promise<Page<Tables[K]>> {
    if (!sortable[table].includes(query.sort))
      throw new BusinessError(400, `Orden inválido; opciones: ${sortable[table].join(', ')}`);
    const qb = this.repo(table).createQueryBuilder('e');
    if (query.q && searchable[table])
      qb.andWhere(`(${searchable[table]!.map((c) => `e."${c}" ILIKE :q`).join(' OR ')})`, {
        q: `%${query.q.replace(/[\\%_]/g, '\\$&')}%`,
      });
    for (const key of ['recordId', 'depositId', 'role', 'alertId', 'archived'] as const)
      if (query[key] !== undefined) {
        if (!this.repo(table).metadata.findColumnWithPropertyName(key))
          throw new BusinessError(400, `Filtro ${key} no permitido`);
        qb.andWhere(`e."${key}" = :${key}`, { [key]: query[key] });
      }
    if (query.status) {
      const key = ['records', 'inspections'].includes(table) ? 'condition' : 'status';
      if (!this.repo(table).metadata.findColumnWithPropertyName(key))
        throw new BusinessError(400, 'Filtro status no permitido');
      qb.andWhere(`e."${key}" = :status`, { status: query.status });
    }
    if (table === 'users') qb.andWhere('e.active = true');
    const [rows, total] = await qb
      .orderBy(`e.${query.sort}`, query.order)
      .addOrderBy('e.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items: rows.map((r) => ({ ...r }) as Tables[K]),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async transaction<T>(work: (repo: Repository) => Promise<T>): Promise<T> {
    if (this.insideTransaction) return work(this);
    return this.ds.transaction(async (manager) => {
      // Serializa transiciones del pequeño archivo; también funciona con varias réplicas.
      await manager.query('SELECT pg_advisory_xact_lock(731903)');
      return work(new PgRepository(this.ds, manager, true));
    });
  }
  async health() {
    try {
      await this.manager.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
