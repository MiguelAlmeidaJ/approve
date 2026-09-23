import Link from "next/link";
import { Brand } from "../components/brand";

export default function NotFound() {
  return (
    <main className="not-found">
      <Brand />
      <span className="eyebrow">404</span>
      <h1>Esse link de aprovação não está mais disponível.</h1>
      <p>
        Peça à equipe da Terceiro Andar o link atualizado do seu calendário.
      </p>
      <Link href="/">Voltar</Link>
    </main>
  );
}
