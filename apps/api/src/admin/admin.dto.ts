import { Channel } from "@approve/database";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength
} from "class-validator";

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;
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
}

export class CreateContentItemDto {
  @IsString()
  calendarId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsEnum(Channel)
  channel!: Channel;

  @IsString()
  @MinLength(2)
  format!: string;

  @IsString()
  caption!: string;

  @IsOptional()
  @IsUrl(
    {
      require_protocol: true
    },
    {
      message: "assetUrl precisa ser uma URL completa."
    }
  )
  assetUrl?: string;
}
