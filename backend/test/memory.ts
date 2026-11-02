import { Repository, Runtime, Security } from '../src/domain/ports';
import { BusinessError, ListQuery, Page, Table, Tables, User, Role } from '../src/domain/model';
export class MemoryRepository implements Repository {
  rows = new Map<Table, Map<string, unknown>>();
  async get<K extends Table>(table: K, id: string): Promise<Tables[K] | null> {
    return (this.rows.get(table)?.get(id) as Tables[K]) ?? null;
  }
  async find<K extends Table>(table: K, where: Partial<Tables[K]>): Promise<Tables[K][]> {
    return [...(this.rows.get(table)?.values() ?? [])].filter((row) =>
      Object.entries(where).every(([k, v]) => (row as Record<string, unknown>)[k] === v),
    ) as Tables[K][];
  }
  async list<K extends Table>(table: K, q: ListQuery): Promise<Page<Tables[K]>> {
    let items = await this.find(table, {});
    for (const key of ['recordId', 'depositId', 'role', 'alertId', 'archived'] as const)
      if (q[key] !== undefined)
        items = items.filter((i) => (i as unknown as Record<string, unknown>)[key] === q[key]);
    if (q.status)
      items = items.filter((i) => {
        const r = i as unknown as Record<string, unknown>;
        return (r.status ?? r.condition) === q.status;
      });
    items.sort((a, b) => {
      const x = (a as unknown as Record<string, string>)[q.sort],
        y = (b as unknown as Record<string, string>)[q.sort];
      return (x < y ? -1 : x > y ? 1 : 0) * (q.order === 'ASC' ? 1 : -1);
    });
    return {
      items: items.slice((q.page - 1) * q.limit, q.page * q.limit),
      total: items.length,
      page: q.page,
      limit: q.limit,
    };
  }
  async save<K extends Table>(table: K, value: Tables[K]): Promise<Tables[K]> {
    if (!this.rows.has(table)) this.rows.set(table, new Map());
    this.rows.get(table)!.set(value.id, value);
    return value;
  }
  async remove<K extends Table>(table: K, id: string) {
    this.rows.get(table)?.delete(id);
  }
  async transaction<T>(work: (r: Repository) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.rows);
    try {
      return await work(this);
    } catch (e) {
      this.rows = snapshot;
      throw e;
    }
  }
  async health() {
    return true;
  }
}
export class TestRuntime implements Runtime {
  time = new Date('2026-10-08T12:00:00Z');
  sequence = 0;
  now() {
    return new Date(this.time);
  }
  id() {
    return `id-${++this.sequence}`;
  }
  advance(ms: number) {
    this.time = new Date(this.time.getTime() + ms);
  }
}
export class FakeSecurity implements Security {
  async hash(s: string) {
    return `hash:${s}`;
  }
  async compare(s: string, h: string) {
    return h === `hash:${s}`;
  }
  digest(s: string) {
    return `digest:${s}`;
  }
  sign(u: User, sid: string, type: 'access' | 'refresh') {
    return JSON.stringify({ sub: u.id, role: u.role, sid, type });
  }
  verify(s: string, type: 'access' | 'refresh') {
    const p = JSON.parse(s) as { sub: string; role: Role; sid: string; type: string };
    if (p.type !== type) throw new BusinessError(401, 'Token inválido');
    return p;
  }
}
