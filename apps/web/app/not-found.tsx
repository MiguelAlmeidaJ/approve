import Link from "next/link";
import { Brand } from "../components/brand";

export default function NotFound() {
  return (
    <main className="not-found">
      <Brand />
      <span className="micro-label">404</span>
      <h1>Essa página não está disponível.</h1>
      <p>
        Se você recebeu um link de aprovação, peça à equipe da Terceiro Andar
        o endereço atualizado.
      </p>
      <Link href="/" className="button button-primary">
        Voltar
      </Link>
    </main>
  );
}
