import {
  IsEmail,
  IsString,
  Matches,
  MinLength
} from "class-validator";

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(STRONG_PASSWORD, {
    message:
      "A senha precisa ter ao menos 8 caracteres, maiúscula, minúscula, número e caractere especial."
  })
  password!: string;

  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
