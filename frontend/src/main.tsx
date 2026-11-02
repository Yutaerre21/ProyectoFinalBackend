import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  Activity,
  Archive,
  ArrowRight,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Thermometer,
  Users,
} from 'lucide-react';
import {
  api,
  Alert,
  currentUser,
  date,
  Deposit,
  Inspection,
  labels,
  Page,
  Reading,
  RecordFile,
  saveSession,
  signIn,
  signOut,
  Task,
  User,
} from './api';
import './styles.css';
function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<T>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
function useUser() {
  const [user, setUser] = useState(currentUser());
  useEffect(() => {
    const update = () => setUser(currentUser());
    window.addEventListener('sessionchange', update);
    return () => window.removeEventListener('sessionchange', update);
  }, []);
  return user;
}
function Badge({ value }: { value: string }) {
  return <span className={`badge ${value.toLowerCase()}`}>{labels[value] ?? value}</span>;
}
function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
    </div>
  ) : null;
}
function Head({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
function Empty({ text = 'No hay registros para estos filtros.' }: { text?: string }) {
  return (
    <div className="empty">
      <FolderOpen size={30} />
      <p>{text}</p>
    </div>
  );
}
function Pager({
  total,
  page,
  onPage,
}: {
  total: number;
  page: number;
  onPage: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 10));
  return (
    <div className="pager">
      <span>
        {total} registros · Página {page} de {pages}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
function FormPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="panel form-panel">
      <div className="section-head">
        <h2>{title}</h2>
        <button type="button" className="text-button" onClick={onClose}>
          Cancelar
        </button>
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Submit({ busy, label = 'Guardar' }: { busy: boolean; label?: string }) {
  return (
    <button className="button" disabled={busy} type="submit">
      {busy ? 'Guardando…' : label}
      <ArrowRight size={16} />
    </button>
  );
}
function useMutation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function run(action: () => Promise<unknown>, done: () => void) {
    setBusy(true);
    setError('');
    try {
      await action();
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}
function formData(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  return Object.fromEntries(new FormData(e.currentTarget));
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Leaf size={24} />
      </span>
      <div>
        conserva<span>ARCHIVO HISTÓRICO · CLENA</span>
      </div>
    </div>
  );
}
function LoginPage() {
  const [register, setRegister] = useState(false);
  const { busy, error, run } = useMutation();
  const user = useUser();
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">MEMORIA QUE PERMANECE</p>
          <h1>
            Cuidar el presente.
            <br />
            <em>Conservar la historia.</em>
          </h1>
          <p>
            Una mirada atenta al patrimonio documental. Monitoreo y prevención para el Archivo
            Histórico del CLENA.
          </p>
          <div className="story-lines">
            <span>
              <ShieldCheck /> Prevención de riesgos
            </span>
            <span>
              <Activity /> Seguimiento ambiental
            </span>
            <span>
              <BookOpen /> Memoria documental
            </span>
          </div>
        </div>
        <small>Corporación Luis Eduardo Nieto Arteta · Barranquilla</small>
      </section>
      <section className="login-form">
        <div>
          <p className="eyebrow">BIENVENIDO A CONSERVA</p>
          <h2>{register ? 'Crea tu cuenta' : 'Tu archivo, bajo cuidado.'}</h2>
          <p className="muted">
            {register
              ? 'Las cuentas nuevas tienen acceso público.'
              : 'Ingresa con tu cuenta para continuar.'}
          </p>
          <form
            onSubmit={(e) => {
              const d = formData(e);
              void run(
                async () => {
                  if (register)
                    await api('/auth/register', {
                      method: 'POST',
                      body: JSON.stringify({ ...d, consent: d.consent === 'on' }),
                    });
                  await signIn(String(d.email), String(d.password));
                },
                () => {},
              );
            }}
          >
            {register && (
              <Field label="Nombre">
                <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
              </Field>
            )}
            <Field label="Correo electrónico">
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="tu.correo@ejemplo.com"
              />
            </Field>
            <Field label="Contraseña">
              <input
                name="password"
                type="password"
                required
                minLength={register ? 12 : 1}
                maxLength={72}
                autoComplete={register ? 'new-password' : 'current-password'}
              />
            </Field>
            {register && (
              <label className="check">
                <input name="consent" type="checkbox" required /> Acepto el{' '}
                <Link to="/privacy">aviso de privacidad</Link>.
              </label>
            )}
            <ErrorNotice message={error} />
            <Submit busy={busy} label={register ? 'Crear cuenta' : 'Iniciar sesión'} />
          </form>
          <button className="text-button" onClick={() => setRegister(!register)}>
            {register ? 'Ya tengo cuenta' : 'Crear una cuenta pública'}
          </button>
          <p className="login-note">
            Acceso institucional para archivistas y restauradores.
            <br />
            <Link to="/privacy">Privacidad y uso de datos</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
function Layout() {
  const user = useUser();
  const [logoutError, setLogoutError] = useState('');
  if (!user) return <Navigate to="/login" replace />;
  const internal = user.role !== 'PUBLIC';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          {internal &&
            [
              ['/', LayoutDashboard, 'Vista general'],
              ['/records', Archive, 'Expedientes'],
              ['/alerts', Bell, 'Alertas'],
              ['/environment', Activity, 'Monitoreo ambiental'],
              ['/tasks', ClipboardCheck, 'Intervenciones'],
            ].map(([path, Icon, title]) => {
              const Component = Icon as typeof Leaf;
              return (
                <NavLink key={String(path)} to={String(path)} end={path === '/'}>
                  <Component size={19} />
                  {String(title)}
                </NavLink>
              );
            })}
          {user.role === 'ADMIN' && (
            <>
              <p className="nav-caption">ADMINISTRACIÓN</p>
              <NavLink to="/deposits">
                <Settings size={19} /> Depósitos y umbrales
              </NavLink>
              <NavLink to="/users">
                <Users size={19} /> Usuarios
              </NavLink>
            </>
          )}
          <NavLink to="/account">
            <ShieldCheck size={19} /> Mi cuenta
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="institution">
            <BookOpen size={21} />
            <p>
              El valor de nuestra memoria.<span>Un expediente a la vez.</span>
            </p>
          </div>
          <div className="profile">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{labels[user.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={() => void signOut().catch((e) => setLogoutError((e as Error).message))}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>
            CLENA <span className="separator">/</span> Conservación documental
          </span>
          <span className="live">
            <span /> Sistema de conservación
          </span>
        </div>
        <main id="main">
          <ErrorNotice message={logoutError} />
          <Outlet />
        </main>
        <footer>
          CONSERVA <span>Patrimonio documental, cuidado colectivo.</span>
          <Link to="/privacy">Privacidad</Link>
        </footer>
      </div>
    </div>
  );
}
function StaffOnly({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const user = useUser();
  return user && (admin ? user.role === 'ADMIN' : user.role !== 'PUBLIC') ? (
    children
  ) : (
    <section className="panel public-view">
      <ShieldCheck size={36} />
      <h1>Bienvenido a Conserva</h1>
      <p>
        El inventario y las condiciones de conservación son de acceso institucional. Tu cuenta
        pública no tiene acceso a estos datos.
      </p>
      <Link className="button" to="/account">
        Administrar mi cuenta
      </Link>
    </section>
  );
}
type Dashboard = {
  records: number;
  critical: number;
  openAlerts: number;
  pendingTasks: number;
  overdue: number;
  prioritizedAlerts: Alert[];
  recentReadings: Reading[];
};
function DashboardPage() {
  const { data, error, loading, reload } = useData<Dashboard>('/dashboard');
  const deposits = useData<Page<Deposit>>('/deposits?limit=100&sort=name&order=ASC');
  const names = Object.fromEntries((deposits.data?.items ?? []).map((d) => [d.id, d.name]));
  return (
    <>
      <Head
        eyebrow="CUIDADO DEL PATRIMONIO"
        title="Una mirada al archivo"
        description="Anticipa los riesgos. Protege lo que nos cuenta la historia."
        action={
          <button className="button secondary" onClick={reload}>
            <RefreshCw size={16} /> Actualizar
          </button>
        }
      />
      <ErrorNotice message={error || deposits.error} />
      {loading && !data ? (
        <p role="status">Cargando el estado del archivo…</p>
      ) : (
        data && (
          <>
            <section className="stats">
              {[
                [Archive, data.records, 'Expedientes activos', 'Patrimonio en seguimiento'],
                [
                  Bell,
                  data.openAlerts,
                  'Alertas abiertas',
                  `${data.critical} expedientes en estado crítico`,
                ],
                [
                  ClipboardCheck,
                  data.pendingTasks,
                  'Intervenciones pendientes',
                  'Acciones de conservación',
                ],
                [Activity, data.overdue, 'Inspecciones vencidas', 'Requieren una nueva revisión'],
              ].map(([Icon, value, label, sub], i) => {
                const I = Icon as typeof Leaf;
                return (
                  <article className={`stat stat-${i}`} key={String(label)}>
                    <div>
                      <span>{String(label)}</span>
                      <I size={20} />
                    </div>
                    <strong>{String(value).padStart(2, '0')}</strong>
                    <small>{String(sub)}</small>
                  </article>
                );
              })}
            </section>
            <section className="dashboard-grid">
              <div className="panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">ATENCIÓN PRIORITARIA</p>
                    <h2>Lo que necesita cuidado</h2>
                  </div>
                  <Link className="text-link" to="/alerts">
                    Ver todas <ArrowRight size={16} />
                  </Link>
                </div>
                {data.prioritizedAlerts.length ? (
                  data.prioritizedAlerts.map((a) => (
                    <AlertCard key={a.id} alert={a} deposit={names[a.depositId]} />
                  ))
                ) : (
                  <Empty text="No hay alertas abiertas. Sigue con las inspecciones programadas." />
                )}
                <div className="panel-foot">
                  <ShieldCheck size={17} /> Priorizadas por tipo de riesgo y antigüedad.
                </div>
              </div>
              <div className="panel environment-summary">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">ENTORNO DEL ARCHIVO</p>
                    <h2>Pulso ambiental</h2>
                  </div>
                  <span className="round-icon">
                    <Activity size={20} />
                  </span>
                </div>
                {data.recentReadings.length ? (
                  Object.values(
                    Object.fromEntries(
                      [...data.recentReadings].reverse().map((r) => [r.depositId, r]),
                    ),
                  ).map((r) => (
                    <div className="environment-card" key={r.id}>
                      <h3>{names[r.depositId] ?? 'Depósito'}</h3>
                      <p className="muted">Última lectura recibida</p>
                      <div className="measurements">
                        <div>
                          <Thermometer size={19} />
                          <strong>
                            {r.temperature}
                            <small> °C</small>
                          </strong>
                          <span>Temperatura</span>
                        </div>
                        <div>
                          <Droplets size={19} />
                          <strong>
                            {r.humidity}
                            <small> %</small>
                          </strong>
                          <span>Humedad relativa</span>
                        </div>
                      </div>
                      <small>{date(r.measuredAt)}</small>
                    </div>
                  ))
                ) : (
                  <Empty text="Aún no se han recibido lecturas." />
                )}
                <Link className="button secondary full" to="/environment">
                  Explorar monitoreo <ArrowRight size={16} />
                </Link>
                <p className="muted small">
                  Los rangos de demostración deben validarse con el personal de conservación.
                </p>
              </div>
            </section>
            <section className="care-banner">
              <div className="banner-symbol">
                <Leaf size={40} />
              </div>
              <div>
                <p className="eyebrow">CADA REVISIÓN CUENTA</p>
                <h2>La prevención también conserva la memoria.</h2>
                <p>Registra una inspección y mantén al día el estado de cada expediente.</p>
              </div>
              <Link className="button" to="/records">
                Ir al inventario <ArrowRight size={16} />
              </Link>
            </section>
          </>
        )
      )}
    </>
  );
}
function AlertCard({
  alert: a,
  deposit,
  children,
}: {
  alert: Alert;
  deposit?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className={`alert-card priority-${a.priority}`}>
      <span className="alert-icon">
        <Bell size={18} />
      </span>
      <div className="alert-content">
        <div className="alert-meta">
          <Badge value={a.kind} />
          <span>Prioridad {a.priority}</span>
          <Badge value={a.status} />
        </div>
        <p>{a.message}</p>
        <small>
          {deposit ?? 'Archivo Histórico'} <span>·</span> {date(a.createdAt)}
        </small>
        {a.recordId && (
          <Link className="text-link" to={`/records/${a.recordId}`}>
            Abrir expediente <ArrowRight size={14} />
          </Link>
        )}
        {children}
      </div>
    </article>
  );
}
function RecordsPage() {
  const [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [show, setShow] = useState(false),
    [sort, setSort] = useState('createdAt');
  const data = useData<Page<RecordFile>>(
    `/records?page=${page}&limit=10&archived=false&q=${encodeURIComponent(q)}&status=${status}&sort=${sort}&order=DESC`,
  );
  return (
    <>
      <Head
        eyebrow="INVENTARIO DOCUMENTAL"
        title="Expedientes bajo cuidado"
        description="Ubicación, estado de conservación y trazabilidad en un solo lugar."
        action={
          <button className="button" onClick={() => setShow(!show)}>
            <Plus size={17} /> Nuevo expediente
          </button>
        }
      />
      {show && (
        <FormPanel title="Registrar expediente" onClose={() => setShow(false)}>
          <RecordForm
            onSaved={() => {
              setShow(false);
              data.reload();
            }}
          />
        </FormPanel>
      )}
      <section className="panel">
        <div className="filters">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar expediente"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por código o título…"
            />
          </label>
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {['OPTIMO', 'REGULAR', 'CRITICO'].map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Ordenar expedientes"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="createdAt">Más recientes</option>
            <option value="title">Título (Z–A)</option>
            <option value="nextInspectionAt">Próxima inspección (desc.)</option>
          </select>
        </div>
        <ErrorNotice message={data.error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Expediente</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Próxima inspección</th>
                <th>
                  <span className="sr-only">Detalle</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data?.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link className="record-title" to={`/records/${r.id}`}>
                      {r.title}
                    </Link>
                    <small>{r.code}</small>
                  </td>
                  <td>
                    Est. {r.shelf}
                    <small>Caja {r.box}</small>
                  </td>
                  <td>
                    <Badge value={r.condition} />
                  </td>
                  <td>{date(r.nextInspectionAt)}</td>
                  <td>
                    <Link aria-label={`Ver ${r.code}`} to={`/records/${r.id}`}>
                      <ArrowRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.loading ? (
          <p className="loading" role="status">
            Cargando inventario…
          </p>
        ) : (
          data.data?.total === 0 && <Empty />
        )}
        <Pager page={page} total={data.data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  );
}
function RecordForm({ record, onSaved }: { record?: RecordFile; onSaved: () => void }) {
  const deposits = useData<Page<Deposit>>('/deposits?limit=100&sort=name&order=ASC');
  const { busy, error, run } = useMutation();
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        const d = formData(e);
        void run(
          () =>
            api(record ? `/records/${record.id}` : '/records', {
              method: record ? 'PUT' : 'POST',
              body: JSON.stringify({ ...d, inspectionDays: Number(d.inspectionDays) }),
            }),
          onSaved,
        );
      }}
    >
      <Field label="Código único">
        <input name="code" required minLength={2} maxLength={40} defaultValue={record?.code} />
      </Field>
      <Field label="Título">
        <input name="title" required minLength={3} maxLength={200} defaultValue={record?.title} />
      </Field>
      <Field label="Depósito">
        <select name="depositId" required defaultValue={record?.depositId ?? ''}>
          <option value="" disabled>
            Selecciona un depósito
          </option>
          {deposits.data?.items.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Estantería">
        <input name="shelf" required maxLength={50} defaultValue={record?.shelf} />
      </Field>
      <Field label="Caja">
        <input name="box" required maxLength={50} defaultValue={record?.box} />
      </Field>
      <Field label="Inspeccionar cada (días)">
        <input
          name="inspectionDays"
          type="number"
          required
          min={1}
          max={365}
          defaultValue={record?.inspectionDays ?? 30}
        />
      </Field>
      <div className="span-all">
        <Field label="Descripción">
          <textarea name="description" maxLength={2000} defaultValue={record?.description ?? ''} />
        </Field>
      </div>
      <div className="span-all">
        <ErrorNotice message={error || deposits.error} />
        <Submit busy={busy} />
      </div>
    </form>
  );
}
function RecordDetail() {
  const { id } = useParams();
  const record = useData<RecordFile>(`/records/${id}`);
  const [page, setPage] = useState(1);
  const history = useData<Page<Inspection>>(`/records/${id}/inspections?page=${page}&limit=10`);
  const [mode, setMode] = useState('');
  const { busy, error, run } = useMutation();
  const user = useUser();
  const navigate = useNavigate();
  const r = record.data;
  return (
    <>
      <Link className="back-link" to="/records">
        <ChevronLeft size={16} /> Inventario
      </Link>
      <ErrorNotice message={record.error} />
      {r && (
        <>
          <Head
            eyebrow={r.code}
            title={r.title}
            description={`Estantería ${r.shelf} · Caja ${r.box} · Revisión cada ${r.inspectionDays} días`}
            action={
              !r.archived && (
                <button className="button" onClick={() => setMode('inspect')}>
                  <Plus size={17} /> Registrar inspección
                </button>
              )
            }
          />
          <section className="panel record-summary">
            <Badge value={r.condition} />
            {r.archived && <strong>Expediente archivado</strong>}
            <p>{r.description || 'Sin descripción adicional.'}</p>
            <p className="muted">Próxima inspección: {date(r.nextInspectionAt)}</p>
            {!r.archived && (
              <div className="actions">
                <button className="button secondary" onClick={() => setMode('edit')}>
                  Editar expediente
                </button>
                {user?.role === 'ADMIN' && (
                  <button className="text-button danger" onClick={() => setMode('archive')}>
                    Archivar expediente
                  </button>
                )}
              </div>
            )}
          </section>
          {mode === 'edit' && (
            <FormPanel title="Editar expediente" onClose={() => setMode('')}>
              <RecordForm
                record={r}
                onSaved={() => {
                  setMode('');
                  record.reload();
                }}
              />
            </FormPanel>
          )}
          {mode === 'archive' && (
            <FormPanel title="Archivar este expediente" onClose={() => setMode('')}>
              <p>
                Se retirará del inventario activo y se resolverán sus alertas. El historial se
                conserva.
              </p>
              <ErrorNotice message={error} />
              <button
                className="button danger-button"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => api(`/records/${id}`, { method: 'DELETE' }),
                    () => navigate('/records'),
                  )
                }
              >
                Confirmar archivo
              </button>
            </FormPanel>
          )}
          {mode === 'inspect' && (
            <FormPanel title="Nueva inspección" onClose={() => setMode('')}>
              <form
                onSubmit={(e) => {
                  const d = formData(e);
                  void run(
                    () =>
                      api(`/records/${id}/inspections`, {
                        method: 'POST',
                        body: JSON.stringify({
                          ...d,
                          pests: d.pests === 'on',
                          wear: d.wear === 'on',
                          moisture: d.moisture === 'on',
                        }),
                      }),
                    () => {
                      setMode('');
                      record.reload();
                      history.reload();
                    },
                  );
                }}
              >
                <Field label="Estado de conservación">
                  <select name="condition">
                    <option value="OPTIMO">Óptimo</option>
                    <option value="REGULAR">Regular</option>
                    <option value="CRITICO">Crítico</option>
                  </select>
                </Field>
                <div className="checks">
                  {[
                    ['moisture', 'Humedad visible'],
                    ['pests', 'Indicios de plagas'],
                    ['wear', 'Desgaste'],
                  ].map(([name, label]) => (
                    <label className="check" key={name}>
                      <input type="checkbox" name={name} />
                      {label}
                    </label>
                  ))}
                </div>
                <Field label="Hallazgos y observaciones">
                  <textarea name="notes" required minLength={10} maxLength={2000} />
                </Field>
                <ErrorNotice message={error} />
                <Submit busy={busy} label="Registrar inspección" />
              </form>
            </FormPanel>
          )}
          <section className="panel">
            <div className="section-head">
              <h2>Historial de conservación</h2>
              <BookOpen size={21} />
            </div>
            <ErrorNotice message={history.error} />
            {history.data?.items.map((i) => (
              <article className="history-item" key={i.id}>
                <div>
                  <Badge value={i.condition} />
                  <small>{date(i.createdAt)}</small>
                </div>
                <p>{i.notes}</p>
                <div className="muted small">
                  {[
                    i.moisture && 'Humedad visible',
                    i.pests && 'Indicios de plagas',
                    i.wear && 'Desgaste',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Sin factores adicionales registrados'}
                </div>
              </article>
            ))}
            {history.data?.total === 0 && (
              <Empty text="Este expediente aún no tiene inspecciones." />
            )}
            <Pager total={history.data?.total ?? 0} page={page} onPage={setPage} />
          </section>
        </>
      )}
    </>
  );
}
function AlertsPage() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState('OPEN'),
    [assign, setAssign] = useState<string | null>(null);
  const result = useData<Page<Alert>>(
    `/alerts?page=${page}&limit=10&sort=priority&order=ASC&status=${status}`,
  );
  const { busy, error, run } = useMutation();
  return (
    <>
      <Head
        eyebrow="PREVENCIÓN Y RESPUESTA"
        title="Alertas de conservación"
        description="Estado crítico, condiciones ambientales y revisiones pendientes."
        action={
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void run(() => api('/alerts/evaluate', { method: 'POST' }), result.reload)
            }
          >
            <RefreshCw size={16} /> Evaluar vencimientos
          </button>
        }
      />
      <ErrorNotice message={error} />
      {assign && (
        <FormPanel title="Asignar intervención" onClose={() => setAssign(null)}>
          <TaskForm
            alertId={assign}
            onSaved={() => {
              setAssign(null);
              result.reload();
            }}
          />
        </FormPanel>
      )}
      <section className="panel">
        <div className="filters">
          <label>
            Estado{' '}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="OPEN">Abiertas</option>
              <option value="RESOLVED">Resueltas</option>
              <option value="">Todas</option>
            </select>
          </label>
          <span className="muted small">Prioridad 1: crítica · 2: ambiental · 3: vencimiento</span>
        </div>
        <ErrorNotice message={result.error} />
        {result.data?.items.map((a) => (
          <AlertCard key={a.id} alert={a}>
            {a.status === 'OPEN' && (
              <button className="text-button" onClick={() => setAssign(a.id)}>
                Asignar intervención <ArrowRight size={14} />
              </button>
            )}
          </AlertCard>
        ))}
        {result.data?.total === 0 && <Empty text="No hay alertas en este estado." />}
        <Pager page={page} total={result.data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  );
}
function TaskForm({ alertId, onSaved }: { alertId: string; onSaved: () => void }) {
  const users = useData<Page<User>>('/users?limit=100&sort=name&order=ASC');
  const { busy, error, run } = useMutation();
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        const d = formData(e);
        void run(
          () =>
            api('/tasks', {
              method: 'POST',
              body: JSON.stringify({
                ...d,
                alertId,
                dueAt: new Date(String(d.dueAt)).toISOString(),
              }),
            }),
          onSaved,
        );
      }}
    >
      <Field label="Intervención a realizar">
        <input name="title" required minLength={5} maxLength={200} />
      </Field>
      <Field label="Responsable">
        <select name="assigneeId" required>
          <option value="">Selecciona personal</option>
          {users.data?.items
            .filter((u) => u.role !== 'PUBLIC')
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Fecha límite">
        <input name="dueAt" type="datetime-local" required />
      </Field>
      <div className="span-all">
        <ErrorNotice message={error || users.error} />
        <Submit busy={busy} label="Asignar intervención" />
      </div>
    </form>
  );
}
function TasksPage() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [editing, setEditing] = useState<Task | null>(null);
  const result = useData<Page<Task>>(
    `/tasks?page=${page}&limit=10&sort=dueAt&order=ASC&status=${status}`,
  );
  const users = useData<Page<User>>('/users?limit=100');
  const names = Object.fromEntries((users.data?.items ?? []).map((u) => [u.id, u.name]));
  const user = useUser();
  const { busy, error, run } = useMutation();
  return (
    <>
      <Head
        eyebrow="DEL HALLAZGO A LA ACCIÓN"
        title="Intervenciones"
        description="Organiza el trabajo de cuidado y documenta cada acción realizada."
      />
      {editing && (
        <FormPanel title="Actualizar intervención" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              const d = formData(e);
              void run(
                () => api(`/tasks/${editing.id}`, { method: 'PATCH', body: JSON.stringify(d) }),
                () => {
                  setEditing(null);
                  result.reload();
                },
              );
            }}
          >
            <Field label="Nuevo estado">
              <select name="status">
                {editing.status === 'PENDING' && <option value="IN_PROGRESS">En curso</option>}
                <option value="DONE">Completada</option>
              </select>
            </Field>
            <Field label="Resultado de la intervención (obligatorio al completar)">
              <textarea name="resolution" maxLength={2000} defaultValue={editing.resolution} />
            </Field>
            <ErrorNotice message={error} />
            <Submit busy={busy} />
            <p className="muted small">
              Al completar, registra una inspección o lectura para comprobar si el riesgo
              desapareció.
            </p>
          </form>
        </FormPanel>
      )}
      <section className="panel">
        <div className="filters">
          <label>
            Estado{' '}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {['PENDING', 'IN_PROGRESS', 'DONE'].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ErrorNotice message={result.error || users.error} />
        {result.data?.items.map((t) => (
          <article className="task-item" key={t.id}>
            <div className="task-marker">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <Badge value={t.status} />
              <h3>{t.title}</h3>
              <p className="muted">
                {names[t.assigneeId] ?? 'Responsable'} · Límite: {date(t.dueAt)}
              </p>
              {t.resolution && <p>{t.resolution}</p>}
            </div>
            {t.status !== 'DONE' && (user?.role === 'ADMIN' || t.assigneeId === user?.id) && (
              <button className="button secondary" onClick={() => setEditing(t)}>
                Actualizar
              </button>
            )}
          </article>
        ))}
        {result.data?.total === 0 && (
          <Empty text="No hay intervenciones. Asigna una desde el módulo de alertas." />
        )}
        <Pager page={page} total={result.data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  );
}
function EnvironmentPage() {
  const [page, setPage] = useState(1),
    [deposit, setDeposit] = useState(''),
    [show, setShow] = useState(false);
  const deposits = useData<Page<Deposit>>('/deposits?limit=100&sort=name&order=ASC');
  const readings = useData<Page<Reading>>(
    `/readings?page=${page}&limit=10&sort=measuredAt&order=DESC${deposit ? `&depositId=${deposit}` : ''}`,
  );
  const names = Object.fromEntries((deposits.data?.items ?? []).map((d) => [d.id, d.name]));
  const { busy, error, run } = useMutation();
  return (
    <>
      <Head
        eyebrow="CONDICIONES DEL ENTORNO"
        title="Monitoreo ambiental"
        description="Temperatura y humedad relativa registradas por depósito."
        action={
          <button className="button" onClick={() => setShow(!show)}>
            <Plus size={17} /> Registrar lectura
          </button>
        }
      />
      {show && (
        <FormPanel title="Lectura manual o simulada" onClose={() => setShow(false)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              const d = formData(e);
              void run(
                () =>
                  api('/readings', {
                    method: 'POST',
                    body: JSON.stringify({
                      ...d,
                      temperature: Number(d.temperature),
                      humidity: Number(d.humidity),
                      measuredAt: new Date().toISOString(),
                    }),
                  }),
                () => {
                  setShow(false);
                  readings.reload();
                },
              );
            }}
          >
            <Field label="Depósito">
              <select name="depositId" required>
                <option value="">Selecciona un depósito</option>
                {deposits.data?.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Identificador del sensor">
              <input
                name="sensorId"
                defaultValue="MANUAL-01"
                required
                minLength={2}
                maxLength={80}
              />
            </Field>
            <Field label="Temperatura (°C)">
              <input name="temperature" type="number" step="0.1" min={-50} max={80} required />
            </Field>
            <Field label="Humedad relativa (%)">
              <input name="humidity" type="number" step="0.1" min={0} max={100} required />
            </Field>
            <div className="span-all">
              <ErrorNotice message={error} />
              <Submit busy={busy} label="Registrar lectura" />
            </div>
          </form>
        </FormPanel>
      )}
      <div className="notice">
        <Activity size={19} />
        <span>
          Los umbrales son configurables por depósito. El simulador de sensores también envía
          lecturas a esta API.
        </span>
      </div>
      <section className="panel">
        <div className="filters">
          <label>
            Depósito{' '}
            <select
              value={deposit}
              onChange={(e) => {
                setDeposit(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los depósitos</option>
              {deposits.data?.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button className="text-button" onClick={readings.reload}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
        <ErrorNotice message={readings.error || deposits.error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Depósito / sensor</th>
                <th>Temperatura</th>
                <th>Humedad relativa</th>
                <th>Medición</th>
              </tr>
            </thead>
            <tbody>
              {readings.data?.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    {names[r.depositId]}
                    <small>{r.sensorId}</small>
                  </td>
                  <td>
                    <Thermometer className="inline-icon" size={16} />
                    {r.temperature} °C
                  </td>
                  <td>
                    <Droplets className="inline-icon" size={16} />
                    {r.humidity} %
                  </td>
                  <td>{date(r.measuredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {readings.data?.total === 0 && <Empty />}
        <Pager page={page} total={readings.data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  );
}
function DepositsPage() {
  const [page, setPage] = useState(1);
  const result = useData<Page<Deposit>>(`/deposits?page=${page}&limit=10&sort=name&order=ASC`);
  const [edit, setEdit] = useState<Deposit | 'new' | null>(null);
  const { busy, error, run } = useMutation();
  const d = edit && edit !== 'new' ? edit : null;
  return (
    <>
      <Head
        eyebrow="CONFIGURACIÓN DEL ARCHIVO"
        title="Depósitos y umbrales"
        description="Define los rangos ambientales que activan las alertas."
        action={
          <button className="button" onClick={() => setEdit('new')}>
            <Plus size={17} /> Nuevo depósito
          </button>
        }
      />
      <div className="notice">
        Los valores semilla son ilustrativos. El personal de conservación debe definir los rangos
        adecuados para cada colección.
      </div>
      {edit && (
        <FormPanel title={d ? 'Editar depósito' : 'Nuevo depósito'} onClose={() => setEdit(null)}>
          <form
            key={d?.id ?? 'new'}
            className="form-grid"
            onSubmit={(e) => {
              const data = formData(e);
              void run(
                () =>
                  api(d ? `/deposits/${d.id}` : '/deposits', {
                    method: d ? 'PUT' : 'POST',
                    body: JSON.stringify({
                      ...data,
                      tempMin: Number(data.tempMin),
                      tempMax: Number(data.tempMax),
                      humidityMin: Number(data.humidityMin),
                      humidityMax: Number(data.humidityMax),
                    }),
                  }),
                () => {
                  setEdit(null);
                  result.reload();
                },
              );
            }}
          >
            <div className="span-all">
              <Field label="Nombre">
                <input name="name" required minLength={2} maxLength={100} defaultValue={d?.name} />
              </Field>
            </div>
            {(['tempMin', 'tempMax', 'humidityMin', 'humidityMax'] as const).map((key, i) => (
              <Field
                key={key}
                label={
                  [
                    'Temperatura mínima (°C)',
                    'Temperatura máxima (°C)',
                    'Humedad mínima (%)',
                    'Humedad máxima (%)',
                  ][i]
                }
              >
                <input
                  name={key}
                  type="number"
                  step="0.1"
                  required
                  min={i < 2 ? -50 : 0}
                  max={i < 2 ? 80 : 100}
                  defaultValue={d?.[key]}
                />
              </Field>
            ))}
            <div className="span-all">
              <ErrorNotice message={error} />
              <Submit busy={busy} />
              <p className="muted small">
                Los cambios de umbral se evalúan al recibir la próxima lectura.
              </p>
            </div>
          </form>
        </FormPanel>
      )}
      <section className="panel">
        <ErrorNotice message={result.error} />
        {result.data?.items.map((d) => (
          <article className="task-item" key={d.id}>
            <div className="task-marker">
              <Archive />
            </div>
            <div>
              <h3>{d.name}</h3>
              <p className="muted">
                Temperatura: {d.tempMin}–{d.tempMax} °C · Humedad: {d.humidityMin}–{d.humidityMax} %
              </p>
            </div>
            <button className="button secondary" onClick={() => setEdit(d)}>
              Editar
            </button>
          </article>
        ))}
        <Pager page={page} total={result.data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  );
}
function UsersPage() {
  const [page, setPage] = useState(1),
    [show, setShow] = useState(false);
  const result = useData<Page<User>>(`/users?page=${page}&limit=10&sort=name&order=ASC`);
  const { busy, error, run } = useMutation();
  return (
    <>
      <Head
        eyebrow="ACCESO INSTITUCIONAL"
        title="Usuarios y roles"
        description="Crea cuentas para el equipo de conservación."
        action={
          <button className="button" onClick={() => setShow(!show)}>
            <Plus size={17} /> Crear usuario
          </button>
        }
      />
      {show && (
        <FormPanel title="Nuevo usuario" onClose={() => setShow(false)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              const d = formData(e);
              void run(
                () =>
                  api('/users', {
                    method: 'POST',
                    body: JSON.stringify({ ...d, consent: d.consent === 'on' }),
                  }),
                () => {
                  setShow(false);
                  result.reload();
                },
              );
            }}
          >
            <Field label="Nombre">
              <input name="name" required minLength={2} maxLength={100} />
            </Field>
            <Field label="Correo">
              <input type="email" name="email" required />
            </Field>
            <Field label="Contraseña inicial (12–72 caracteres)">
              <input
                type="password"
                name="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Rol">
              <select name="role">
                <option value="STAFF">Personal CLENA</option>
                <option value="ADMIN">Administrador</option>
                <option value="PUBLIC">Usuario público</option>
              </select>
            </Field>
            <div className="span-all">
              <label className="check">
                <input name="consent" type="checkbox" required /> El titular ha aceptado el aviso de
                privacidad.
              </label>
              <ErrorNotice message={error} />
              <Submit busy={busy} />
            </div>
          </form>
        </FormPanel>
      )}
      <section className="panel">
        <ErrorNotice message={result.error} />
        {result.data?.items.map((u) => (
          <article className="task-item" key={u.id}>
            <span className="avatar">{u.name[0]}</span>
            <div>
              <h3>{u.name}</h3>
              <p className="muted">{u.email}</p>
            </div>
            <Badge value={u.role} />
          </article>
        ))}
        <Pager page={page} total={result.data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  );
}
function AccountPage() {
  const user = useUser();
  const [deleting, setDeleting] = useState(false);
  const { busy, error, run } = useMutation();
  return (
    <>
      <Head
        eyebrow="TU SESIÓN"
        title="Mi cuenta"
        description="Información de acceso y control de tus datos."
      />
      <section className="panel record-summary">
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
        <Badge value={user?.role ?? 'PUBLIC'} />
        <p>Los datos del inventario son de acceso restringido al personal autorizado.</p>
        <Link to="/privacy">Consultar aviso de privacidad</Link>
        <hr />
        <button className="text-button danger" onClick={() => setDeleting(!deleting)}>
          Eliminar mi cuenta
        </button>
        {deleting && (
          <form
            onSubmit={(e) => {
              const d = formData(e);
              void run(
                () => api('/auth/account', { method: 'DELETE', body: JSON.stringify(d) }),
                () => saveSession(null),
              );
            }}
          >
            <p>
              Tu nombre y correo se anonimizarán y se cerrarán tus sesiones. Las inspecciones e
              intervenciones institucionales conservarán una referencia anónima.
            </p>
            <Field label="Confirma tu contraseña">
              <input type="password" name="password" required autoComplete="current-password" />
            </Field>
            <ErrorNotice message={error} />
            <Submit busy={busy} label="Confirmar eliminación" />
          </form>
        )}
      </section>
    </>
  );
}
function PrivacyPage() {
  return (
    <main className="privacy">
      <Brand />
      <h1>Aviso de privacidad</h1>
      <p>
        Conserva es un prototipo académico del proyecto P3 para el Archivo Histórico del CLENA.
        Utiliza datos ficticios durante la demostración.
      </p>
      <h2>Datos y finalidad</h2>
      <p>
        Se solicitan nombre, correo, contraseña (almacenada como hash), rol y fecha de
        consentimiento para administrar el acceso y atribuir inspecciones e intervenciones. El
        inventario no es público.
      </p>
      <h2>Control de tus datos</h2>
      <p>
        Puedes consultar tus datos y solicitar la eliminación desde Mi cuenta. El sistema anonimiza
        el nombre y correo, revoca las sesiones y mantiene referencias anónimas en el historial de
        conservación.
      </p>
      <h2>Antes del uso institucional</h2>
      <p>
        El CLENA y la universidad deben validar el responsable del tratamiento, el canal de
        atención, los plazos de conservación y el texto definitivo. No se deben registrar datos
        personales reales hasta completar esa validación.
      </p>
      <Link className="button" to="/">
        Volver a Conserva <ArrowRight size={16} />
      </Link>
    </main>
  );
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route element={<Layout />}>
          <Route
            index
            element={
              <StaffOnly>
                <DashboardPage />
              </StaffOnly>
            }
          />
          <Route
            path="records"
            element={
              <StaffOnly>
                <RecordsPage />
              </StaffOnly>
            }
          />
          <Route
            path="records/:id"
            element={
              <StaffOnly>
                <RecordDetail />
              </StaffOnly>
            }
          />
          <Route
            path="alerts"
            element={
              <StaffOnly>
                <AlertsPage />
              </StaffOnly>
            }
          />
          <Route
            path="environment"
            element={
              <StaffOnly>
                <EnvironmentPage />
              </StaffOnly>
            }
          />
          <Route
            path="tasks"
            element={
              <StaffOnly>
                <TasksPage />
              </StaffOnly>
            }
          />
          <Route
            path="deposits"
            element={
              <StaffOnly admin>
                <DepositsPage />
              </StaffOnly>
            }
          />
          <Route
            path="users"
            element={
              <StaffOnly admin>
                <UsersPage />
              </StaffOnly>
            }
          />
          <Route path="account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
