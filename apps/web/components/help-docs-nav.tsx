import Link from "next/link";
import { FiBookOpen, FiLayers, FiTrendingUp } from "react-icons/fi";

export function HelpDocsNav({
  active
}: {
  active: "home" | "designer" | "points";
}) {
  const items = [
    {
      key: "home",
      href: "/ajuda",
      label: "Visão geral",
      icon: FiBookOpen
    },
    {
      key: "designer",
      href: "/ajuda/fluxo-designer",
      label: "Fluxo do designer",
      icon: FiLayers
    },
    {
      key: "points",
      href: "/ajuda/pontos",
      label: "Pontos e capacidade",
      icon: FiTrendingUp
    }
  ] as const;

  return (
    <nav className="help-docs-nav" aria-label="Documentação do sistema">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            href={item.href}
            className={active === item.key ? "active" : ""}
            key={item.key}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
