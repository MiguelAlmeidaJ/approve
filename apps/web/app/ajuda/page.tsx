import Link from "next/link";
import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiImage,
  FiLayers,
  FiRefreshCw,
  FiTrendingUp
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { HelpDocsNav } from "../../components/help-docs-nav";
import { requireDesigner } from "../../lib/auth";

export default async function HelpPage() {
  const designer = await requireDesigner();

  return (
    <AppShell designer={designer} activeSection="help">
      <header className="page-header compact-header help-docs-header">
        <div>
          <span className="micro-label">AJUDA E DOCUMENTAÇÃO</span>
          <h1>Como usar o sistema</h1>
          <p>
            Consulte os fluxos operacionais, entenda o que cada etapa significa
            e veja o passo a passo das principais rotinas.
          </p>
        </div>
      </header>

      <HelpDocsNav active="home" />

      <section className="help-docs-intro">
        <article>
          <FiBookOpen aria-hidden="true" />
          <div>
            <span>COMECE POR AQUI</span>
            <strong>O sistema acompanha a operação do planejamento à publicação.</strong>
            <p>
              Cada demanda passa por etapas claras, com responsável, prazo,
              aprovação do cliente e histórico de alterações.
            </p>
          </div>
        </article>

        <article>
          <FiCheckCircle aria-hidden="true" />
          <div>
            <span>REGRA PRINCIPAL</span>
            <strong>Use “Meu dia” para saber o que precisa ser feito agora.</strong>
            <p>
              A Central de demandas serve para organizar fila, capacidade e
              planejamento. O calendário mostra o fluxo completo do cliente.
            </p>
          </div>
        </article>
      </section>

      <section className="help-docs-section">
        <div className="help-docs-section-head">
          <div>
            <span className="micro-label">GUIAS</span>
            <h2>Principais rotinas</h2>
          </div>
        </div>

        <div className="help-docs-card-grid">
          <Link href="/ajuda/fluxo-designer" className="help-docs-card">
            <FiLayers aria-hidden="true" />
            <div>
              <strong>Fluxo do designer</strong>
              <p>
                O que fazer quando chega uma arte nova, uma alteração, uma arte
                avulsa e como funciona o pré-calendário.
              </p>
            </div>
            <FiArrowRight aria-hidden="true" />
          </Link>

          <Link href="/ajuda/pontos" className="help-docs-card">
            <FiTrendingUp aria-hidden="true" />
            <div>
              <strong>Pontos e capacidade</strong>
              <p>
                Entenda esforço, capacidade semanal, WIP e como o sistema mede
                a carga da equipe.
              </p>
            </div>
            <FiArrowRight aria-hidden="true" />
          </Link>

          <Link href="/producao" className="help-docs-card">
            <FiRefreshCw aria-hidden="true" />
            <div>
              <strong>Central de demandas</strong>
              <p>
                Organize fila, alertas, planejamento semanal e distribuição de
                demandas entre designers.
              </p>
            </div>
            <FiArrowRight aria-hidden="true" />
          </Link>

          <Link href="/artes-avulsas" className="help-docs-card">
            <FiImage aria-hidden="true" />
            <div>
              <strong>Artes avulsas</strong>
              <p>
                Acompanhe demandas fora do calendário e o fluxo de produção,
                aprovação, ajustes e entrega.
              </p>
            </div>
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="help-docs-section">
        <div className="help-docs-section-head">
          <div>
            <span className="micro-label">MAPA RÁPIDO</span>
            <h2>Qual tela eu uso?</h2>
          </div>
        </div>

        <div className="help-docs-table">
          <div className="help-docs-table-row head">
            <span>Quando você precisa...</span>
            <span>Use</span>
          </div>
          <div className="help-docs-table-row">
            <strong>Saber o que fazer agora</strong>
            <span>Meu dia</span>
          </div>
          <div className="help-docs-table-row">
            <strong>Produzir ou replanejar demandas</strong>
            <span>Central de demandas</span>
          </div>
          <div className="help-docs-table-row">
            <strong>Ver todo o fluxo de um cliente</strong>
            <span>Calendários</span>
          </div>
          <div className="help-docs-table-row">
            <strong>Trabalhar uma demanda fora do calendário</strong>
            <span>Artes avulsas</span>
          </div>
          <div className="help-docs-table-row">
            <strong>Entender carga e pontos</strong>
            <span>Pontos e capacidade</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
