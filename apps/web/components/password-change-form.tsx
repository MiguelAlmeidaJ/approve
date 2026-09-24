"use client";

import { useMemo, useState } from "react";
import {
  FiCheck,
  FiCircle
} from "react-icons/fi";
import { changeDesignerPassword } from "../app/login/actions";

const rules = [
  {
    key: "length",
    label: "8 ou mais caracteres",
    test: (value: string) => value.length >= 8
  },
  {
    key: "upper",
    label: "Uma letra maiúscula",
    test: (value: string) => /[A-Z]/.test(value)
  },
  {
    key: "lower",
    label: "Uma letra minúscula",
    test: (value: string) => /[a-z]/.test(value)
  },
  {
    key: "number",
    label: "Um número",
    test: (value: string) => /\d/.test(value)
  },
  {
    key: "special",
    label: "Um caractere especial",
    test: (value: string) => /[^A-Za-z0-9]/.test(value)
  }
] as const;

export function PasswordChangeForm({
  error
}: {
  error?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const ruleState = useMemo(
    () =>
      rules.map((rule) => ({
        ...rule,
        valid: rule.test(password)
      })),
    [password]
  );

  const score = ruleState.filter((rule) => rule.valid).length;
  const matches = password.length > 0 && password === confirmation;
  const canSubmit = score === rules.length && matches;

  return (
    <form action={changeDesignerPassword} className="login-form password-change-form">
      <div>
        <span className="micro-label">PRIMEIRO ACESSO</span>
        <h2>Defina sua nova senha</h2>
        <p>
          Por segurança, a senha temporária ou inicial não pode continuar sendo
          usada.
        </p>
      </div>

      {error ? (
        <div className="form-error">
          {error === "password"
            ? "A nova senha não atende aos requisitos ou coincide com a senha atual."
            : "Não foi possível alterar a senha agora. Tente novamente."}
        </div>
      ) : null}

      <label className="field">
        <span>Nova senha</span>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Crie uma senha forte"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
        />
      </label>

      <div className="password-strength">
        <div className="password-strength-head">
          <span>Força da senha</span>
          <strong>
            {score <= 2 ? "Fraca" : score <= 4 ? "Boa" : "Forte"}
          </strong>
        </div>
        <div className="password-strength-bar" aria-hidden="true">
          {rules.map((rule, index) => (
            <span
              className={index < score ? "active" : ""}
              key={rule.key}
            />
          ))}
        </div>
        <div className="password-rule-grid">
          {ruleState.map((rule) => (
            <span
              className={rule.valid ? "password-rule valid" : "password-rule"}
              key={rule.key}
            >
              {rule.valid ? (
                <FiCheck aria-hidden="true" />
              ) : (
                <FiCircle aria-hidden="true" />
              )}
              {rule.label}
            </span>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Confirmar nova senha</span>
        <input
          type="password"
          name="confirmPassword"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Digite a senha novamente"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {confirmation ? (
        <div
          className={
            matches
              ? "password-match valid"
              : "password-match invalid"
          }
        >
          {matches ? "As senhas coincidem." : "As senhas ainda não coincidem."}
        </div>
      ) : null}

      <button
        type="submit"
        className="button button-primary button-wide"
        disabled={!canSubmit}
      >
        Salvar nova senha
      </button>
    </form>
  );
}
