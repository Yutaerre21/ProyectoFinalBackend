export type User = { id: string; name: string; email: string; role: 'ADMIN' | 'STAFF' | 'PUBLIC' };
export type Page<T> = { items: T[]; total: number; page: number; limit: number };
export type Deposit = {
  id: string;
  name: string;
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
};
export type RecordFile = {
  id: string;
  code: string;
  title: string;
  depositId: string;
  shelf: string;
  box: string;
  description: string;
  inspectionDays: number;
  nextInspectionAt: string;
  condition: string;
  archived: boolean;
};
export type Inspection = {
  id: string;
  condition: string;
  notes: string;
  pests: boolean;
  wear: boolean;
  moisture: boolean;
  createdAt: string;
};
export type Reading = {
  id: string;
  depositId: string;
  sensorId: string;
  temperature: number;
  humidity: number;
  measuredAt: string;
};
export type Alert = {
  id: string;
  kind: string;
  priority: number;
  recordId: string | null;
  depositId: string;
  message: string;
  status: string;
  createdAt: string;
};
export type Task = {
  id: string;
  alertId: string;
  assigneeId: string;
  title: string;
  dueAt: string;
  status: string;
  resolution: string;
};
type Session = { accessToken: string; refreshToken: string; user: User };
let session: Session | null = null;
try {
  session = JSON.parse(sessionStorage.getItem('clena-session') ?? 'null') as Session | null;
} catch {
  sessionStorage.removeItem('clena-session');
}
export const currentUser = () => session?.user ?? null;
export function saveSession(value: Session | null) {
  session = value;
  if (value) sessionStorage.setItem('clena-session', JSON.stringify(value));
  else sessionStorage.removeItem('clena-session');
  window.dispatchEvent(new Event('sessionchange'));
}
let refreshing: Promise<void> | null = null;
export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && session && retry && !path.startsWith('/auth/')) {
    if (!refreshing)
      refreshing = (async () => {
        try {
          const r = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: session?.refreshToken }),
          });
          if (!r.ok) throw new Error('Sesión vencida');
          saveSession((await r.json()) as Session);
        } catch (e) {
          saveSession(null);
          throw e;
        } finally {
          refreshing = null;
        }
      })();
    await refreshing;
    return api<T>(path, options, false);
  }
  const body = (await response.json()) as T & { message?: string | string[] };
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join('. ')
        : (body.message ?? 'No se pudo completar la operación'),
    );
  return body;
}
export async function signIn(email: string, password: string) {
  saveSession(
    await api<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  );
}
export async function signOut() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    saveSession(null);
  }
}
export const date = (value: string) =>
  new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
export const labels: Record<string, string> = {
  OPTIMO: 'Óptimo',
  REGULAR: 'Regular',
  CRITICO: 'Crítico',
  OPEN: 'Abierta',
  RESOLVED: 'Resuelta',
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Completada',
  CRITICAL: 'Estado crítico',
  ENVIRONMENT: 'Riesgo ambiental',
  OVERDUE: 'Inspección vencida',
  ADMIN: 'Administrador',
  STAFF: 'Personal CLENA',
  PUBLIC: 'Usuario público',
};
