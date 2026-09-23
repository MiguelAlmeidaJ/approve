import { ReviewAction } from "@approve/database";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

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
