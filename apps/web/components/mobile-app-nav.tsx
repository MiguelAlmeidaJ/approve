"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiFolder,
  FiHome,
  FiImage,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiPieChart,
  FiSettings,
  FiShield,
  FiSliders,
  FiStar,
  FiTrendingUp,
  FiTool,
  FiUserCheck,
  FiUsers,
  FiX
} from "react-icons/fi";
import { logoutDesigner } from "../app/actions";
import type { Designer } from "../lib/api";
import { Brand } from "./brand";
import type { AppSection } from "./app-shell";
import { hasUserPermission } from "../lib/permissions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function itemClass(active: boolean) {
  return active ? "mobile-nav-link active" : "mobile-nav-link";
}

export function MobileAppNav({
  designer,
  activeSection
}: {
  designer: Designer;
  activeSection: AppSection;
}) {
  const [open, setOpen] = useState(false);
  const canSeeUsers = designer.role === "ADMIN" || designer.role === "DEV";
  const canSeeFormats = designer.role === "ADMIN" || designer.role === "DEV";
  const canSeeConfig = designer.role === "DEV";
  const canSeeReports = hasUserPermission(designer, "REPORTS_VIEW");

  const close = () => setOpen(false);

  return (
    <>
      <header className="mobile-app-nav">
        <Brand />
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <FiMenu aria-hidden="true" />
        </button>
      </header>

      {open ? (
        <div className="mobile-nav-layer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="mobile-nav-backdrop"
            onClick={close}
            aria-label="Fechar menu"
          />

          <aside className="mobile-nav-drawer">
            <div className="mobile-nav-head">
              <Brand />
              <button
                type="button"
                className="mobile-nav-close"
                onClick={close}
                aria-label="Fechar menu"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>

            <nav className="mobile-nav-scroll" aria-label="Navegação principal">
              <Link href="/" onClick={close} className={itemClass(activeSection === "panel")}>
                <FiHome aria-hidden="true" />
                Painel
              </Link>
              <Link href="/meu-dia" onClick={close} className={itemClass(activeSection === "today")}>
                <FiActivity aria-hidden="true" />
                Meu dia
              </Link>

              <details open={["calendars", "production", "standalone"].includes(activeSection)}>
                <summary>
                  <span><FiFolder aria-hidden="true" />Operação</span>
                  <FiChevronDown aria-hidden="true" />
                </summary>
                <div>
                  <Link href="/calendars" onClick={close} className={itemClass(activeSection === "calendars")}>
                    <FiCalendar aria-hidden="true" />Calendários
                  </Link>
                  <Link href="/producao" onClick={close} className={itemClass(activeSection === "production")}>
                    <FiTool aria-hidden="true" />Central de demandas
                  </Link>
                  <Link href="/artes-avulsas" onClick={close} className={itemClass(activeSection === "standalone")}>
                    <FiImage aria-hidden="true" />Artes avulsas
                  </Link>
                </div>
              </details>

              <details open={["clients", "team", "capacity"].includes(activeSection)}>
                <summary>
                  <span><FiUsers aria-hidden="true" />Gestão</span>
                  <FiChevronDown aria-hidden="true" />
                </summary>
                <div>
                  <Link href="/clients" onClick={close} className={itemClass(activeSection === "clients")}>
                    <FiUsers aria-hidden="true" />Clientes
                  </Link>
                  {canSeeUsers ? (
                    <>
                      <Link href="/equipe" onClick={close} className={itemClass(activeSection === "team")}>
                        <FiUserCheck aria-hidden="true" />Equipe
                      </Link>
                      <Link href="/capacidade" onClick={close} className={itemClass(activeSection === "capacity")}>
                        <FiTrendingUp aria-hidden="true" />Capacidade
                      </Link>
                    </>
                  ) : null}
                </div>
              </details>

              <details open={["templates", "dates", "formats"].includes(activeSection)}>
                <summary>
                  <span><FiClipboard aria-hidden="true" />Conteúdo</span>
                  <FiChevronDown aria-hidden="true" />
                </summary>
                <div>
                  {canSeeFormats ? (
                    <Link href="/modelos" onClick={close} className={itemClass(activeSection === "templates")}>
                      <FiClipboard aria-hidden="true" />Modelos de pauta
                    </Link>
                  ) : null}
                  <Link href="/datas-comemorativas" onClick={close} className={itemClass(activeSection === "dates")}>
                    <FiStar aria-hidden="true" />Datas comemorativas
                  </Link>
                  {canSeeFormats ? (
                    <Link href="/formats" onClick={close} className={itemClass(activeSection === "formats")}>
                      <FiSliders aria-hidden="true" />Formatos
                    </Link>
                  ) : null}
                </div>
              </details>

              {canSeeReports ? (
                <details open={["reports", "productivity"].includes(activeSection)}>
                  <summary>
                    <span><FiBarChart2 aria-hidden="true" />Resultados</span>
                    <FiChevronDown aria-hidden="true" />
                  </summary>
                  <div>
                    <Link href="/relatorios" onClick={close} className={itemClass(activeSection === "reports")}>
                      <FiPieChart aria-hidden="true" />Relatórios
                    </Link>
                    <Link href="/produtividade" onClick={close} className={itemClass(activeSection === "productivity")}>
                      <FiAward aria-hidden="true" />Produtividade
                    </Link>
                  </div>
                </details>
              ) : null}

              {canSeeUsers || canSeeConfig ? (
                <details open={["audit", "identity", "config"].includes(activeSection)}>
                  <summary>
                    <span><FiSettings aria-hidden="true" />Sistema</span>
                    <FiChevronDown aria-hidden="true" />
                  </summary>
                  <div>
                    {canSeeUsers ? (
                      <>
                        <Link href="/auditoria" onClick={close} className={itemClass(activeSection === "audit")}>
                          <FiShield aria-hidden="true" />Auditoria
                        </Link>
                        <Link href="/identidade-visual" onClick={close} className={itemClass(activeSection === "identity")}>
                          <FiLayers aria-hidden="true" />Identidade visual
                        </Link>
                      </>
                    ) : null}
                    {canSeeConfig ? (
                      <Link href="/config" onClick={close} className={itemClass(activeSection === "config")}>
                        <FiSettings aria-hidden="true" />Configurações
                      </Link>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </nav>

            <div className="mobile-nav-user">
              <span className="mobile-nav-avatar">{initials(designer.name) || "TA"}</span>
              <div>
                <strong>{designer.name}</strong>
                <small>{designer.email}</small>
              </div>
              <form action={logoutDesigner}>
                <button type="submit" aria-label="Sair" title="Sair">
                  <FiLogOut aria-hidden="true" />
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
