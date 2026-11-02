import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Authenticate } from '../application/auth';
import { BusinessError, Role } from '../domain/model';
export type AuthRequest = Request & { user: Awaited<ReturnType<Authenticate['execute']>> };
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authenticate: Authenticate,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Se requiere una sesión');
    req.user = await this.authenticate.execute(token);
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(req.user.role))
      throw new ForbiddenException('No tienes permiso para esta acción');
    return true;
  }
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private logger = new Logger('HTTP');
  catch(error: unknown, host: ArgumentsHost) {
    let status = 500;
    let message: string | string[] = 'Error interno del servidor';
    if (error instanceof BusinessError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const response = error.getResponse();
      message =
        typeof response === 'string'
          ? response
          : (response as { message: string | string[] }).message;
    } else if (typeof error === 'object' && error && 'driverError' in error) {
      const code = (error.driverError as { code?: string }).code;
      if (code === '23505') {
        status = 409;
        message = 'Ya existe un registro con esos datos';
      } else if (code === '23503') {
        status = 400;
        message = 'Referencia inexistente o registro utilizado';
      } else if (code === '23514') {
        status = 400;
        message = 'Los datos incumplen una regla de integridad';
      }
    }
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    if (status === 500)
      this.logger.error({
        event: 'request_failed',
        path: req.path,
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
    ctx
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message, path: req.path, timestamp: new Date().toISOString() });
  }
}
