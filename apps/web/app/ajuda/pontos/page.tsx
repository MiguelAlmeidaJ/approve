import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiHelpCircle,
  FiLayers,
  FiTarget,
  FiTrendingUp,
  FiZap
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { requireDesigner } from "../../../lib/auth";

const examples = [
  { label: "Story simples", points: 1, note: "Peça rápida, baixa complexidade." },
  { label: "Post estático", points: 2, note: "Criação padrão para feed." },
  { label: "Carrossel até 5 páginas", points: 3, note: "Mais etapas de composição e revisão." },
  { label: "Carrossel 6–10 páginas", points: 5, note: "Volume maior de telas e consistência visual." },
  { label: "Reel simples", points: 4, note: "Edição leve, cortes e acabamento básico." },
  { label: "Reel com edição pesada", points: 7, note: "Mais cenas, tratamento, motion ou ritmo complexo." },
  { label: "Campanha / peça especial", points: "8–12", note: "Maior esforço criativo e refinamento." }
];

export default async function PointsHelpPage() {
  const designer = await requireDesigner();

  return (
    <AppShell designer={designer} activeSection="help">
      <header className="page-header compact-header">
        <div>
          <span className="micro-label">AJUDA</span>
          <h1>Como funcionam os pontos?</h1>
          <p>
            Pontos são uma unidade de esforço usada para equilibrar a carga de
            produção. Eles ajudam a comparar demandas diferentes sem tratar um
            Story simples como se tivesse o mesmo peso de um Reel ou de um
            carrossel mais complexo.
          </p>
        </div>
      </header>

      <section className="points-help-hero">
        <article>
          <FiTarget aria-hidden="true" />
          <div>
            <span>IDEIA PRINCIPAL</span>
            <strong>Pontos medem esforço, não horas.</strong>
            <p>
              Uma demanda de 3 pontos não significa 3 horas. Ela representa um
              nível de esforço relativo dentro da operação.
            </p>
          </div>
        </article>

        <article>
          <FiTrendingUp aria-hidden="true" />
          <div>
            <span>CAPACIDADE SEMANAL</span>
            <strong>Ex.: 30 pontos por semana.</strong>
            <p>
              Se um designer está em 22/30 pts, ele está usando cerca de 73% da
              capacidade configurada para a semana.
            </p>
          </div>
        </article>

        <article>
          <FiActivity aria-hidden="true" />
          <div>
            <span>WIP</span>
            <strong>O sistema soma as demandas ativas.</strong>
            <p>
              Demandas concluídas saem do WIP. Demandas abertas continuam
              contando até serem finalizadas.
            </p>
          </div>
        </article>
      </section>

      <section className="points-help-grid">
        <article className="points-help-card">
          <div className="points-help-card-head">
            <FiHelpCircle aria-hidden="true" />
            <div>
              <h2>Como interpretar</h2>
              <p>
                Quanto maior a complexidade, o volume ou o esforço esperado,
                maior deve ser a pontuação.
              </p>
            </div>
          </div>

          <div className="points-capacity-examples">
            <div>
              <span className="points-status ok" />
              <div>
                <strong>22 / 30 pts</strong>
                <small>Capacidade confortável</small>
              </div>
            </div>
            <div>
              <span className="points-status warning" />
              <div>
                <strong>27 / 30 pts</strong>
                <small>Próximo do limite</small>
              </div>
            </div>
            <div>
              <span className="points-status danger" />
              <div>
                <strong>38 / 30 pts</strong>
                <small>Sobrecarga</small>
              </div>
            </div>
          </div>
        </article>

        <article className="points-help-card">
          <div className="points-help-card-head">
            <FiClock aria-hidden="true" />
            <div>
              <h2>Pontos x prazo</h2>
              <p>
                Prazo e pontos são coisas diferentes e trabalham juntos no
                planejamento.
              </p>
            </div>
          </div>

          <div className="points-help-callout">
            <strong>Exemplo</strong>
            <p>
              Uma demanda pode ter apenas 2 pontos e ainda assim ser crítica se
              vence hoje. Outra pode ter 8 pontos e estar tranquila se o prazo é
              para a próxima semana.
            </p>
          </div>
        </article>
      </section>

      <section className="points-help-section">
        <div className="section-title-row">
          <div>
            <span className="micro-label">REFERÊNCIA</span>
            <h2>Exemplo de pontuação</h2>
          </div>
        </div>

        <div className="points-reference-table">
          <div className="points-reference-head">
            <span>Tipo de demanda</span>
            <span>Pontos</span>
            <span>Quando usar</span>
          </div>
          {examples.map((item) => (
            <div className="points-reference-row" key={item.label}>
              <strong>{item.label}</strong>
              <span className="points-pill">{item.points} pts</span>
              <small>{item.note}</small>
            </div>
          ))}
        </div>

        <div className="points-reference-note">
          <FiAlertCircle aria-hidden="true" />
          <p>
            Essa tabela é uma referência operacional. Os pontos podem ser
            ajustados quando a demanda real for mais simples ou mais complexa do
            que o padrão.
          </p>
        </div>
      </section>

      <section className="points-help-section">
        <div className="section-title-row">
          <div>
            <span className="micro-label">EXEMPLO PRÁTICO</span>
            <h2>Como fechar uma semana de 30 pontos</h2>
          </div>
        </div>

        <div className="points-week-example">
          <div><span>3 posts</span><strong>6 pts</strong></div>
          <div><span>2 carrosséis</span><strong>6 pts</strong></div>
          <div><span>2 reels</span><strong>8 pts</strong></div>
          <div><span>5 stories</span><strong>5 pts</strong></div>
          <div><span>1 ajuste complexo</span><strong>5 pts</strong></div>
          <div className="total"><span>Total</span><strong>30 pts</strong></div>
        </div>
      </section>

      <section className="points-help-grid">
        <article className="points-help-card">
          <div className="points-help-card-head">
            <FiLayers aria-hidden="true" />
            <div>
              <h2>Onde os pontos aparecem</h2>
              <p>
                A pontuação alimenta várias áreas do sistema.
              </p>
            </div>
          </div>
          <ul className="points-help-list">
            <li>WIP e capacidade por designer</li>
            <li>Central de demandas</li>
            <li>Planejamento semanal</li>
            <li>Agenda por designer</li>
            <li>Sugestão automática de responsável</li>
            <li>Produtividade e consumo contratual</li>
          </ul>
        </article>

        <article className="points-help-card">
          <div className="points-help-card-head">
            <FiBarChart2 aria-hidden="true" />
            <div>
              <h2>Como saber se a pontuação está boa?</h2>
              <p>
                Compare o planejamento com a realidade da equipe.
              </p>
            </div>
          </div>
          <ul className="points-help-list">
            <li>Se todo mundo vive acima de 100%, a capacidade pode estar baixa.</li>
            <li>Se tarefas complexas pesam igual às simples, ajuste os pontos.</li>
            <li>Se a equipe fecha a semana perto da capacidade, a calibração está boa.</li>
            <li>Use o histórico de produção para revisar a régua periodicamente.</li>
          </ul>
        </article>
      </section>

      <section className="points-help-final">
        <FiZap aria-hidden="true" />
        <div>
          <strong>Regra rápida</strong>
          <p>
            Use poucos pontos para trabalho simples e repetitivo, mais pontos
            para demandas que exigem mais criação, edição, volume ou revisão.
            O objetivo é refletir esforço de forma consistente, não buscar uma
            precisão de horas.
          </p>
        </div>
        <FiCheckCircle aria-hidden="true" />
      </section>
    </AppShell>
  );
}
