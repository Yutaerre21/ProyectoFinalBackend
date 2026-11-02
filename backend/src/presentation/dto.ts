import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class LoginDto {
  @ApiProperty({ example: 'admin@clena.example' })
  @IsEmail()
  @MaxLength(254)
  @Transform(trim)
  email!: string;
  @ApiProperty({ format: 'password' }) @IsString() @Length(1, 72) password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'Nombre de demostración' })
  @IsString()
  @Transform(trim)
  @Length(2, 100)
  name!: string;
  @ApiProperty({ minLength: 12, maxLength: 72 })
  @IsString()
  @Length(12, 72)
  declare password: string;
  @ApiProperty({ example: true }) @Equals(true) consent!: boolean;
}
export class CreateUserDto extends RegisterDto {
  @ApiProperty({ enum: ['ADMIN', 'STAFF', 'PUBLIC'] }) @IsIn(['ADMIN', 'STAFF', 'PUBLIC']) role!:
    'ADMIN' | 'STAFF' | 'PUBLIC';
}
export class RefreshDto {
  @ApiProperty() @IsString() @Length(20, 2000) refreshToken!: string;
}
export class DeleteAccountDto {
  @ApiProperty({ format: 'password' }) @IsString() @Length(1, 72) password!: string;
}
export class ListDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({
    default: 'createdAt',
    description:
      'Según recurso: createdAt, name, code, title, nextInspectionAt, condition, measuredAt, temperature, humidity, priority, status, dueAt, email, role.',
  })
  @IsString()
  @MaxLength(30)
  sort = 'createdAt';
  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' }) @IsIn(['ASC', 'DESC']) order:
    'ASC' | 'DESC' = 'DESC';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() recordId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() depositId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() alertId?: string;
  @ApiPropertyOptional({ enum: ['ADMIN', 'STAFF', 'PUBLIC'] })
  @IsOptional()
  @IsIn(['ADMIN', 'STAFF', 'PUBLIC'])
  role?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  archived?: boolean;
}
export class DepositDto {
  @ApiProperty() @IsString() @Transform(trim) @Length(2, 100) name!: string;
  @ApiProperty({ example: 18 }) @IsNumber() @Min(-50) @Max(80) tempMin!: number;
  @ApiProperty({ example: 24 }) @IsNumber() @Min(-50) @Max(80) tempMax!: number;
  @ApiProperty({ example: 40 }) @IsNumber() @Min(0) @Max(100) humidityMin!: number;
  @ApiProperty({ example: 60 }) @IsNumber() @Min(0) @Max(100) humidityMax!: number;
}
export class RecordDto {
  @ApiProperty({ example: 'EXP-001' }) @IsString() @Transform(trim) @Length(2, 40) code!: string;
  @ApiProperty() @IsString() @Transform(trim) @Length(3, 200) title!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() depositId!: string;
  @ApiProperty({ example: 'E-01' }) @IsString() @Transform(trim) @Length(1, 50) shelf!: string;
  @ApiProperty({ example: 'C-01' }) @IsString() @Transform(trim) @Length(1, 50) box!: string;
  @ApiProperty({ example: 'Descripción del expediente' })
  @IsString()
  @MaxLength(2000)
  description!: string;
  @ApiProperty({ example: 30 }) @IsInt() @Min(1) @Max(365) inspectionDays!: number;
}
export class InspectionDto {
  @ApiProperty({ enum: ['OPTIMO', 'REGULAR', 'CRITICO'] })
  @IsIn(['OPTIMO', 'REGULAR', 'CRITICO'])
  condition!: 'OPTIMO' | 'REGULAR' | 'CRITICO';
  @ApiProperty() @IsString() @Transform(trim) @Length(10, 2000) notes!: string;
  @ApiProperty() @IsBoolean() pests!: boolean;
  @ApiProperty() @IsBoolean() wear!: boolean;
  @ApiProperty() @IsBoolean() moisture!: boolean;
}
export class ReadingDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() depositId!: string;
  @ApiProperty({ example: 'SIM-A-01' })
  @IsString()
  @Transform(trim)
  @Length(2, 80)
  sensorId!: string;
  @ApiProperty({ example: 22 }) @IsNumber() @Min(-50) @Max(80) temperature!: number;
  @ApiProperty({ example: 50 }) @IsNumber() @Min(0) @Max(100) humidity!: number;
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) measuredAt!: string;
}
export class TaskDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() alertId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() assigneeId!: string;
  @ApiProperty() @IsString() @Transform(trim) @Length(5, 200) title!: string;
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) dueAt!: string;
}
export class TaskUpdateDto {
  @ApiProperty({ enum: ['IN_PROGRESS', 'DONE'] }) @IsIn(['IN_PROGRESS', 'DONE']) status!:
    'IN_PROGRESS' | 'DONE';
  @ApiProperty({ example: 'Se realizó la intervención y se documentaron sus resultados.' })
  @IsString()
  @MaxLength(2000)
  resolution!: string;
}
