import { ReviewAction } from "@approve/database";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from "class-validator";

export class ReviewContentDto {
  @IsEnum(ReviewAction)
  action!: ReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reviewerName?: string;
}


export class CreatePublicAnnotationDto {
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
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;
}
