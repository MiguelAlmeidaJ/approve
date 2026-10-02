"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export function PasswordInput({
  className = "",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        className="password-visibility-toggle"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        {visible ? (
          <FiEyeOff aria-hidden="true" />
        ) : (
          <FiEye aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
