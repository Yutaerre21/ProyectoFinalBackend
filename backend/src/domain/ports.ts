import { Table, Tables, ListQuery, Page, User, Role } from './model';
export interface Repository {
  get<K extends Table>(table: K, id: string): Promise<Tables[K] | null>;
  find<K extends Table>(table: K, where: Partial<Tables[K]>): Promise<Tables[K][]>;
  list<K extends Table>(table: K, query: ListQuery): Promise<Page<Tables[K]>>;
  save<K extends Table>(table: K, value: Tables[K]): Promise<Tables[K]>;
  remove<K extends Table>(table: K, id: string): Promise<void>;
  transaction<T>(work: (repo: Repository) => Promise<T>): Promise<T>;
  health(): Promise<boolean>;
}
export interface Runtime {
  now(): Date;
  id(): string;
}
export interface Security {
  hash(value: string): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
  digest(value: string): string;
  sign(user: User, sessionId: string, type: 'access' | 'refresh'): string;
  verify(token: string, type: 'access' | 'refresh'): { sub: string; role: Role; sid: string };
}
