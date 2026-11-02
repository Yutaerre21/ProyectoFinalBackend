import { BusinessError, requireFound, Role, User } from '../domain/model';
import { Repository, Runtime, Security } from '../domain/ports';
export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
  createdAt: u.createdAt,
});
export class RegisterUser {
  constructor(
    private repo: Repository,
    private runtime: Runtime,
    private security: Security,
  ) {}
  async execute(
    input: { name: string; email: string; password: string; consent: boolean },
    role: Role = 'PUBLIC',
  ) {
    if (!input.consent) throw new BusinessError(400, 'Debes aceptar el aviso de privacidad');
    const email = input.email.trim().toLowerCase();
    if ((await this.repo.find('users', { email })).length)
      throw new BusinessError(409, 'Correo ya registrado');
    return publicUser(
      await this.repo.save('users', {
        id: this.runtime.id(),
        createdAt: this.runtime.now(),
        name: input.name,
        email,
        passwordHash: await this.security.hash(input.password),
        role,
        consentAt: this.runtime.now(),
        active: true,
      }),
    );
  }
}
async function issue(repo: Repository, runtime: Runtime, security: Security, user: User) {
  const sid = runtime.id();
  const refreshToken = security.sign(user, sid, 'refresh');
  await repo.save('sessions', {
    id: sid,
    userId: user.id,
    createdAt: runtime.now(),
    expiresAt: new Date(runtime.now().getTime() + 7 * 86400000),
    tokenHash: security.digest(refreshToken),
  });
  return { accessToken: security.sign(user, sid, 'access'), refreshToken, user: publicUser(user) };
}
export class Login {
  constructor(
    private repo: Repository,
    private runtime: Runtime,
    private security: Security,
  ) {}
  async execute(email: string, password: string) {
    const user = (await this.repo.find('users', { email: email.trim().toLowerCase() }))[0];
    if (!user || !user.active || !(await this.security.compare(password, user.passwordHash)))
      throw new BusinessError(401, 'Credenciales incorrectas');
    return issue(this.repo, this.runtime, this.security, user);
  }
}
export class RefreshSession {
  constructor(
    private repo: Repository,
    private runtime: Runtime,
    private security: Security,
  ) {}
  async execute(token: string) {
    const claims = this.security.verify(token, 'refresh');
    return this.repo.transaction(async (repo) => {
      const session = await repo.get('sessions', claims.sid);
      if (
        !session ||
        session.userId !== claims.sub ||
        session.expiresAt <= this.runtime.now() ||
        session.tokenHash !== this.security.digest(token)
      )
        throw new BusinessError(401, 'Sesión vencida o revocada');
      const user = await repo.get('users', claims.sub);
      if (!user?.active) throw new BusinessError(401, 'Cuenta inactiva');
      await repo.remove('sessions', session.id);
      return issue(repo, this.runtime, this.security, user);
    });
  }
}
export class Authenticate {
  constructor(
    private repo: Repository,
    private runtime: Runtime,
    private security: Security,
  ) {}
  async execute(token: string) {
    const claims = this.security.verify(token, 'access');
    const session = await this.repo.get('sessions', claims.sid);
    const user = await this.repo.get('users', claims.sub);
    if (
      !session ||
      session.userId !== claims.sub ||
      session.expiresAt <= this.runtime.now() ||
      !user?.active
    )
      throw new BusinessError(401, 'Sesión no válida');
    return { ...publicUser(user), sid: session.id };
  }
}
export class Logout {
  constructor(private repo: Repository) {}
  async execute(sid: string) {
    await this.repo.remove('sessions', sid);
    return { message: 'Sesión cerrada' };
  }
}
export class DeleteAccount {
  constructor(
    private repo: Repository,
    private security: Security,
  ) {}
  async execute(id: string, password: string) {
    return this.repo.transaction(async (repo) => {
      const user = requireFound(await repo.get('users', id), 'Usuario');
      if (!(await this.security.compare(password, user.passwordHash)))
        throw new BusinessError(401, 'Contraseña incorrecta');
      if (
        user.role === 'ADMIN' &&
        (await repo.find('users', { role: 'ADMIN', active: true })).length < 2
      )
        throw new BusinessError(409, 'Crea otro administrador antes de eliminar esta cuenta');
      await repo.save('users', {
        ...user,
        name: 'Cuenta eliminada',
        email: `${id}@deleted.invalid`,
        passwordHash: '',
        active: false,
      });
      for (const s of await repo.find('sessions', { userId: id }))
        await repo.remove('sessions', s.id);
      return { message: 'Cuenta anonimizada y sesiones revocadas' };
    });
  }
}
