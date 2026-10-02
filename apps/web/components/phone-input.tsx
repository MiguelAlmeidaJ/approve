"use client";

import { useState } from "react";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatBrazilianPhone(value: string) {
  const digits = onlyDigits(value);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  const isMobile = digits.length > 10;
  const split = isMobile ? 7 : 6;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export function PhoneInput({
  name,
  defaultValue = "",
  required = false,
  placeholder = "(22) 99999-9999"
}: {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(() => formatBrazilianPhone(defaultValue ?? ""));

  return (
    <input
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(event) => setValue(formatBrazilianPhone(event.target.value))}
      placeholder={placeholder}
      minLength={14}
      maxLength={15}
      required={required}
    />
  );
}
