import { randomUUID, createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { BusinessError, Role, User } from '../domain/model';
import { Runtime, Security } from '../domain/ports';
export class SystemRuntime implements Runtime {
  now() {
    return new Date();
  }
  id() {
    return randomUUID();
  }
}
export class JwtSecurity implements Security {
  private jwt = new JwtService();
  constructor(
    private accessSecret: string,
    private refreshSecret: string,
  ) {
    if (accessSecret.length < 32 || refreshSecret.length < 32 || accessSecret === refreshSecret)
      throw new Error('JWT secrets: usa dos valores diferentes de al menos 32 caracteres');
  }
  hash(value: string) {
    if (Buffer.byteLength(value, 'utf8') > 72)
      throw new BusinessError(400, 'La contraseña no puede superar 72 bytes en UTF-8');
    return hash(value, 12);
  }
  compare(value: string, passwordHash: string) {
    return compare(value, passwordHash);
  }
  digest(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
  sign(user: User, sid: string, type: 'access' | 'refresh') {
    return this.jwt.sign(
      { sub: user.id, role: user.role, sid, type },
      {
        secret: type === 'access' ? this.accessSecret : this.refreshSecret,
        expiresIn: type === 'access' ? '15m' : '7d',
        issuer: 'clena-conserva',
        audience: 'clena-web',
        algorithm: 'HS256',
      },
    );
  }
  verify(token: string, type: 'access' | 'refresh') {
    try {
      const p = this.jwt.verify<{ sub: string; role: Role; sid: string; type: string }>(token, {
        secret: type === 'access' ? this.accessSecret : this.refreshSecret,
        issuer: 'clena-conserva',
        audience: 'clena-web',
        algorithms: ['HS256'],
      });
      if (p.type !== type || !p.sub || !p.sid) throw new Error();
      return p;
    } catch {
      throw new BusinessError(401, 'Token inválido o vencido');
    }
  }
}
