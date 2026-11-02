import {
  Authenticate,
  DeleteAccount,
  Login,
  Logout,
  RefreshSession,
  RegisterUser,
} from '../src/application/auth';
import { FakeSecurity, MemoryRepository, TestRuntime } from './memory';
describe('Casos de uso de identidad', () => {
  let repo: MemoryRepository;
  let rt: TestRuntime;
  let sec: FakeSecurity;
  const input = {
    name: 'Archivista',
    email: 'persona@example.com',
    password: 'Una clave de prueba',
    consent: true,
  };
  beforeEach(() => {
    repo = new MemoryRepository();
    rt = new TestRuntime();
    sec = new FakeSecurity();
  });
  const register = () => new RegisterUser(repo, rt, sec);
  it('normaliza correo, conserva consentimiento y no expone hash', async () => {
    const user = await register().execute({ ...input, email: ' PERSONA@example.com ' });
    expect(user.email).toBe(input.email);
    expect(user).not.toHaveProperty('passwordHash');
    expect(user.role).toBe('PUBLIC');
    expect((await repo.get('users', user.id))?.consentAt).toEqual(rt.now());
    await expect(register().execute(input)).rejects.toThrow('registrado');
    await expect(register().execute({ ...input, consent: false })).rejects.toThrow('privacidad');
  });
  it('login, rotación y revocación de ambos tokens', async () => {
    await register().execute(input, 'STAFF');
    const login = new Login(repo, rt, sec);
    const auth = new Authenticate(repo, rt, sec);
    const first = await login.execute(input.email, input.password);
    expect((await auth.execute(first.accessToken)).role).toBe('STAFF');
    const next = await new RefreshSession(repo, rt, sec).execute(first.refreshToken);
    await expect(new RefreshSession(repo, rt, sec).execute(first.refreshToken)).rejects.toThrow(
      'revocada',
    );
    await expect(auth.execute(first.accessToken)).rejects.toThrow('Sesión');
    const current = await auth.execute(next.accessToken);
    await new Logout(repo).execute(current.sid);
    await expect(auth.execute(next.accessToken)).rejects.toThrow('Sesión');
  });
  it('rechaza credenciales y usuarios inactivos', async () => {
    const login = new Login(repo, rt, sec);
    await expect(login.execute(input.email, input.password)).rejects.toThrow('Credenciales');
    const u = await register().execute(input);
    await expect(login.execute(input.email, 'incorrecta')).rejects.toThrow('Credenciales');
    const stored = (await repo.get('users', u.id))!;
    await repo.save('users', { ...stored, active: false });
    await expect(login.execute(input.email, input.password)).rejects.toThrow('Credenciales');
  });
  it('rechaza sesión vencida, digest incorrecto y cuenta inactiva', async () => {
    const u = await register().execute(input);
    const login = new Login(repo, rt, sec);
    const refresh = new RefreshSession(repo, rt, sec);
    let token = await login.execute(input.email, input.password);
    rt.advance(8 * 86400000);
    await expect(refresh.execute(token.refreshToken)).rejects.toThrow('Sesión');
    await expect(new Authenticate(repo, rt, sec).execute(token.accessToken)).rejects.toThrow(
      'Sesión',
    );
    token = await login.execute(input.email, input.password);
    let session = (await repo.find('sessions', {})).find((s) => s.expiresAt > rt.now())!;
    await repo.save('sessions', { ...session, tokenHash: 'alterado' });
    await expect(refresh.execute(token.refreshToken)).rejects.toThrow('Sesión');
    token = await login.execute(input.email, input.password);
    session = (await repo.find('sessions', {})).at(-1)!;
    await repo.save('sessions', { ...session, userId: 'otro' });
    await expect(refresh.execute(token.refreshToken)).rejects.toThrow('Sesión');
    await expect(new Authenticate(repo, rt, sec).execute(token.accessToken)).rejects.toThrow(
      'Sesión',
    );
    token = await login.execute(input.email, input.password);
    await repo.save('users', { ...(await repo.get('users', u.id))!, active: false });
    await expect(refresh.execute(token.refreshToken)).rejects.toThrow('inactiva');
    await expect(new Authenticate(repo, rt, sec).execute(token.accessToken)).rejects.toThrow(
      'Sesión',
    );
  });
  it('anonimiza cuenta, revoca todas las sesiones y protege último admin', async () => {
    const user = await register().execute(input);
    await new Login(repo, rt, sec).execute(input.email, input.password);
    const del = new DeleteAccount(repo, sec);
    await expect(del.execute(user.id, 'mala')).rejects.toThrow('incorrecta');
    await del.execute(user.id, input.password);
    expect(await repo.find('sessions', {})).toHaveLength(0);
    expect((await repo.get('users', user.id))?.active).toBe(false);
    expect((await repo.get('users', user.id))?.email).toContain('deleted.invalid');
    const a = await register().execute({ ...input, email: 'admin@example.com' }, 'ADMIN');
    await expect(del.execute(a.id, input.password)).rejects.toThrow('otro administrador');
    await register().execute({ ...input, email: 'admin2@example.com' }, 'ADMIN');
    await expect(del.execute(a.id, input.password)).resolves.toHaveProperty('message');
    await expect(del.execute('missing', input.password)).rejects.toThrow('no encontrado');
  });
});
