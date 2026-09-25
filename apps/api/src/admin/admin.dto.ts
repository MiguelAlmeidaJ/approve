import {
  Channel,
  CommemorativeScope,
  ContentType,
  UserRole
} from "@approve/database";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
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
  Max,
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

  @IsOptional()
  @IsString()
  toneOfVoice?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  services?: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  prohibitedTerms?: string;

  @IsOptional()
  @IsString()
  hashtags?: string;

  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @IsString()
  mlabsProfileId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  postingWeekdays!: number[];
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

  @IsOptional()
  @IsString()
  toneOfVoice?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  services?: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  prohibitedTerms?: string;

  @IsOptional()
  @IsString()
  hashtags?: string;

  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @IsString()
  mlabsProfileId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  postingWeekdays!: number[];
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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  weeklyCapacityPoints?: number;
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

  @IsOptional()
  @IsDateString()
  planningDueAt?: string;

  @IsOptional()
  @IsDateString()
  planningApprovalDueAt?: string;

  @IsOptional()
  @IsDateString()
  artworkDueAt?: string;

  @IsOptional()
  @IsDateString()
  artworkApprovalDueAt?: string;

  @IsOptional()
  @IsDateString()
  schedulingDueAt?: string;

  @IsOptional()
  @IsDateString()
  shareExpiresAt?: string;

  @IsOptional()
  @IsBoolean()
  generateSkeleton?: boolean;
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

  @IsOptional()
  @IsDateString()
  planningDueAt?: string;

  @IsOptional()
  @IsDateString()
  planningApprovalDueAt?: string;

  @IsOptional()
  @IsDateString()
  artworkDueAt?: string;

  @IsOptional()
  @IsDateString()
  artworkApprovalDueAt?: string;

  @IsOptional()
  @IsDateString()
  schedulingDueAt?: string;

  @IsOptional()
  @IsDateString()
  shareExpiresAt?: string;
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


export class CreateCommemorativeDateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(CommemorativeScope)
  scope?: CommemorativeScope;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCommemorativeDateDto extends CreateCommemorativeDateDto {}


export class CreateContentCommentDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsBoolean()
  visibleToClient?: boolean;
}

export class CreateBriefingTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  niche?: string;

  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  subheadline?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  designerNotes?: string;

  @IsBoolean()
  publishToFeed!: boolean;

  @IsBoolean()
  publishToStories!: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateBriefingTemplateDto extends CreateBriefingTemplateDto {}

export class UpdateContentMetricsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  reach?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  impressions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  likes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  comments?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shares?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  saves?: number;
}


export class CreateContentAnnotationDto {
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  x!: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  y!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;
}

export class ResolveContentAnnotationDto {
  @IsBoolean()
  resolved!: boolean;
}
