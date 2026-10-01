import Image from "next/image";
import Link from "next/link";
import { FiArrowUpRight, FiLock, FiShield } from "react-icons/fi";
import { Brand } from "./brand";

export function PublicClientLogo({
  src,
  name,
  className = ""
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  return (
    <span className={["public-client-logo", className].filter(Boolean).join(" ")}>
      {src ? (
        <Image
          src={src}
          alt={`Logo ${name}`}
          width={180}
          height={180}
          sizes="180px"
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

export function PublicPresentationHeader({
  clientName,
  calendarTitle,
  status,
  pageHref,
  accountHref,
  accountLabel,
  clientLogoSrc
}: {
  clientName: string;
  calendarTitle: string;
  status: string;
  pageHref: string;
  accountHref: string;
  accountLabel: string;
  clientLogoSrc?: string;
}) {
  return (
    <header className="commercial-public-header">
      <div className="commercial-public-header-inner">
        <Link href={pageHref} className="commercial-public-brand">
          <Brand />
          <span className="commercial-public-brand-divider" aria-hidden="true" />
          <PublicClientLogo src={clientLogoSrc} name={clientName} />
          <span className="commercial-public-title">
            <small>Apresentação de conteúdo</small>
            <strong>{clientName}</strong>
          </span>
        </Link>

        <div className="commercial-public-header-actions">
          <span className="commercial-public-status">
            <i aria-hidden="true" />
            {status}
          </span>
          <Link href={accountHref} className="commercial-public-account-link">
            {accountLabel}
            <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="commercial-public-context">
        <FiLock aria-hidden="true" />
        <span>Link privado</span>
        <i aria-hidden="true" />
        <strong>{calendarTitle}</strong>
      </div>
    </header>
  );
}

export function PublicPresentationFooter({
  clientName,
  calendarTitle,
  clientLogoSrc
}: {
  clientName: string;
  calendarTitle: string;
  clientLogoSrc?: string;
}) {
  return (
    <footer className="commercial-public-footer">
      <div className="commercial-public-footer-main">
        <div className="commercial-public-footer-agency">
          <Brand />
          <p>
            Estratégia, criação e aprovação de conteúdo em um fluxo
            simples e transparente.
          </p>
        </div>

        <div className="commercial-public-footer-client">
          <PublicClientLogo src={clientLogoSrc} name={clientName} />
          <span>
            <small>Apresentado para</small>
            <strong>{clientName}</strong>
            <em>{calendarTitle}</em>
          </span>
        </div>
      </div>

      <div className="commercial-public-footer-meta">
        <span>
          <FiShield aria-hidden="true" />
          Ambiente privado de aprovação
        </span>
        <span>Terceiro Andar · Conteúdo que move marcas</span>
      </div>
    </footer>
  );
}
