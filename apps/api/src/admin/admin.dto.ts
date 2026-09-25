import {
  Channel,
  ContentType,
  UserRole
} from "@approve/database";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength
} from "class-validator";

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(2)
  niche!: string;

  @IsString()
  @MinLength(8)
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  nextcloudPath?: string;

  @IsOptional()
  @IsString()
  assignedDesignerId?: string;
}

export class UpdateClientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  niche!: string;

  @IsString()
  @MinLength(8)
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  nextcloudPath?: string;
}

export class SetActiveDto {
  @IsBoolean()
  active!: boolean;
}

export class AssignClientDto {
  @IsOptional()
  @IsString()
  designerId?: string | null;
}

export class CreateDesignerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class CreateCalendarDto {
  @IsString()
  clientId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @IsDateString({}, { each: true })
  postingDays!: string[];
}

export class UpdateCalendarDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @IsDateString({}, { each: true })
  postingDays!: string[];
}

export class CreateContentFormatDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsInt()
  @Min(1)
  width!: number;

  @IsInt()
  @Min(1)
  height!: number;

  @IsBoolean()
  supportsFeed!: boolean;

  @IsBoolean()
  supportsStories!: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateContentFormatDto extends CreateContentFormatDto {}

export class MoveContentItemDto {
  @IsDateString()
  scheduledAt!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  postingDate!: string;
}

export class CreateContentItemDto {
  @IsString()
  calendarId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsDateString()
  scheduledAt!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  postingDate!: string;

  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsString()
  formatId!: string;

  @IsBoolean()
  publishToFeed!: boolean;

  @IsBoolean()
  publishToStories!: boolean;

  @IsString()
  caption!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  assetPaths!: string[];

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: "assetUrl precisa ser uma URL completa." }
  )
  assetUrl?: string;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;
}


export class CreatePlanningItemDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  theme!: string;

  @IsString()
  @MinLength(2)
  headline!: string;

  @IsOptional()
  @IsString()
  subheadline?: string;

  @IsOptional()
  @IsString()
  designerNotes?: string;

  @IsDateString()
  scheduledAt!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  postingDate!: string;

  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsBoolean()
  publishToFeed!: boolean;

  @IsBoolean()
  publishToStories!: boolean;

  @IsString()
  @MinLength(2)
  caption!: string;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;
}

export class UpdatePlanningItemDto extends CreatePlanningItemDto {}

export class AttachArtworkDto {
  @IsString()
  formatId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  assetPaths!: string[];
}

export class MarkScheduledDto {
  @IsOptional()
  @IsString()
  externalScheduleId?: string;
}

export class MarkSchedulingErrorDto {
  @IsString()
  @MinLength(2)
  message!: string;
}
