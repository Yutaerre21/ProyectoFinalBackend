import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeleteAccount, Login, Logout, RefreshSession, RegisterUser } from '../application/auth';
import {
  ArchiveRecord,
  AssignTask,
  CreateDeposit,
  CreateRecord,
  EvaluateOverdue,
  GetDashboard,
  GetRecord,
  Health,
  IngestReading,
  ListItems,
  RegisterInspection,
  UpdateDeposit,
  UpdateRecord,
  UpdateTask,
} from '../application/conservation';
import {
  CreateUserDto,
  DeleteAccountDto,
  DepositDto,
  InspectionDto,
  ListDto,
  LoginDto,
  ReadingDto,
  RecordDto,
  RefreshDto,
  RegisterDto,
  TaskDto,
  TaskUpdateDto,
} from './dto';
import { AuthRequest, Public, Roles } from './http';
@ApiTags('Sesión')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private login: Login,
    private register: RegisterUser,
    private refresh: RefreshSession,
    private logout: Logout,
    private deleteAccount: DeleteAccount,
  ) {}
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión: JWT access (15 min) y refresh (7 días)' })
  signIn(@Body() dto: LoginDto) {
    return this.login.execute(dto.email, dto.password);
  }
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Crear cuenta pública con consentimiento explícito' })
  signUp(@Body() dto: RegisterDto) {
    return this.register.execute(dto);
  }
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotar refresh token; el anterior queda revocado' })
  renew(@Body() dto: RefreshDto) {
    return this.refresh.execute(dto.refreshToken);
  }
  @ApiBearerAuth() @Get('me') @ApiOperation({ summary: 'Consultar perfil de la sesión' }) me(
    @Req() req: AuthRequest,
  ) {
    const { sid: _sid, ...user } = req.user;
    return user;
  }
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Revocar sesión actual y sus tokens' })
  close(@Req() req: AuthRequest) {
    return this.logout.execute(req.user.sid);
  }
  @ApiBearerAuth()
  @Delete('account')
  @ApiOperation({ summary: 'Anonimizar datos personales conservando trazabilidad institucional' })
  remove(@Req() req: AuthRequest, @Body() dto: DeleteAccountDto) {
    return this.deleteAccount.execute(req.user.id, dto.password);
  }
}
@ApiTags('Conservación')
@ApiBearerAuth()
@Roles('ADMIN', 'STAFF')
@Controller('api/v1')
export class ConservationController {
  constructor(
    private list: ListItems,
    private createDeposit: CreateDeposit,
    private updateDeposit: UpdateDeposit,
    private createRecord: CreateRecord,
    private updateRecord: UpdateRecord,
    private archiveRecord: ArchiveRecord,
    private getRecord: GetRecord,
    private inspect: RegisterInspection,
    private ingest: IngestReading,
    private evaluate: EvaluateOverdue,
    private assign: AssignTask,
    private updateTask: UpdateTask,
    private dashboard: GetDashboard,
    private register: RegisterUser,
  ) {}
  @Get('dashboard')
  @ApiOperation({ summary: 'Indicadores, alertas priorizadas y lecturas recientes' })
  overview() {
    return this.dashboard.execute();
  }
  @Get('deposits') @ApiOperation({ summary: 'Listar depósitos y umbrales (paginado)' }) deposits(
    @Query() q: ListDto,
  ) {
    return this.list.execute('deposits', q);
  }
  @Roles('ADMIN')
  @Post('deposits')
  @ApiOperation({ summary: 'Crear depósito y umbrales; solo administrador' })
  newDeposit(@Body() dto: DepositDto) {
    return this.createDeposit.execute(dto);
  }
  @Roles('ADMIN')
  @Put('deposits/:id')
  @ApiOperation({ summary: 'Actualizar depósito; los umbrales aplican a la próxima lectura' })
  editDeposit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DepositDto) {
    return this.updateDeposit.execute(id, dto);
  }
  @Get('records')
  @ApiOperation({
    summary: 'Inventario; buscar código/título, filtrar estado/depósito/archivado',
  })
  records(@Query() q: ListDto) {
    return this.list.execute('records', q);
  }
  @Get('records/:id') @ApiOperation({ summary: 'Detalle de expediente' }) record(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.getRecord.execute(id);
  }
  @Post('records')
  @ApiOperation({ summary: 'Crear expediente; primera inspección pendiente de inmediato' })
  newRecord(@Body() dto: RecordDto) {
    return this.createRecord.execute(dto);
  }
  @Put('records/:id')
  @ApiOperation({ summary: 'Editar ubicación, metadatos y periodicidad' })
  editRecord(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordDto) {
    return this.updateRecord.execute(id, dto);
  }
  @Roles('ADMIN')
  @Delete('records/:id')
  @ApiOperation({ summary: 'Archivar expediente sin borrar historial' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.archiveRecord.execute(id);
  }
  @Get('records/:id/inspections')
  @ApiOperation({ summary: 'Historial paginado de inspecciones' })
  history(@Param('id', ParseUUIDPipe) id: string, @Query() q: ListDto) {
    return this.list.execute('inspections', { ...q, recordId: id });
  }
  @Post('records/:id/inspections')
  @ApiOperation({
    summary: 'Registrar inspección, actualizar vencimiento y evaluar estado crítico',
  })
  inspection(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: InspectionDto,
  ) {
    return this.inspect.execute(id, req.user.id, dto);
  }
  @Get('readings')
  @ApiOperation({
    summary: 'Historial ambiental; filtrar depósito, buscar sensor, ordenar por measuredAt',
  })
  readings(@Query() q: ListDto) {
    return this.list.execute('readings', q);
  }
  @Post('readings')
  @ApiOperation({ summary: 'Ingestar temperatura y humedad y evaluar alerta ambiental' })
  reading(@Body() dto: ReadingDto) {
    return this.ingest.execute({ ...dto, measuredAt: new Date(dto.measuredAt) });
  }
  @Get('alerts')
  @ApiOperation({ summary: 'Alertas paginadas; usar sort=priority&order=ASC&status=OPEN' })
  alerts(@Query() q: ListDto) {
    return this.list.execute('alerts', q);
  }
  @Post('alerts/evaluate')
  @ApiOperation({ summary: 'Evaluar vencimientos ahora; también se ejecuta cada 60 segundos' })
  check() {
    return this.evaluate.execute();
  }
  @Get('tasks')
  @ApiOperation({ summary: 'Listar intervenciones con filtros y ordenamiento' })
  tasks(@Query() q: ListDto) {
    return this.list.execute('tasks', q);
  }
  @Post('tasks') @ApiOperation({ summary: 'Asignar una intervención a personal activo' }) task(
    @Body() dto: TaskDto,
  ) {
    return this.assign.execute({ ...dto, dueAt: new Date(dto.dueAt) });
  }
  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Avanzar tarea; solo responsable o administrador' })
  progress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TaskUpdateDto,
    @Req() req: AuthRequest,
  ) {
    return this.updateTask.execute(id, dto, req.user);
  }
  @Get('users')
  @ApiOperation({ summary: 'Directorio de usuarios activos, sin contraseñas ni tokens' })
  users(@Query() q: ListDto) {
    return this.list.execute('users', q);
  }
  @Roles('ADMIN')
  @Post('users')
  @ApiOperation({ summary: 'Crear usuario con rol institucional; solo administrador' })
  user(@Body() dto: CreateUserDto) {
    return this.register.execute(dto, dto.role);
  }
}
@Controller()
export class HealthController {
  constructor(private health: Health) {}
  @Public()
  @Get('health')
  @ApiTags('Operación')
  @ApiOperation({ summary: 'Salud de API y conexión a PostgreSQL' })
  check() {
    return this.health.execute();
  }
}
