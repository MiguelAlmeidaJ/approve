import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiImage,
  FiLayers,
  FiRefreshCw,
  FiSend,
  FiTool
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { HelpDocsNav } from "../../../components/help-docs-nav";
import { requireDesigner } from "../../../lib/auth";

const flows = [
  {
    id: "nova-arte",
    eyebrow: "ARTE NOVA",
    title: "Quando chega uma nova arte para produzir",
    icon: FiImage,
    intro:
      "A demanda já passou pela aprovação do briefing e entra na etapa de produção.",
    steps: [
      {
        title: "Abra Meu dia ou a Central de demandas",
        text:
          "A nova peça aparece na sua fila como Aguardando ou Em produção, com cliente, prazo, pontos e responsável."
      },
      {
        title: "Confira briefing, formato e prazo",
        text:
          "Abra a demanda antes de começar. O briefing aprovado é a referência oficial para a criação."
      },
      {
        title: "Passe a demanda para Em produção",
        text:
          "Na Central de demandas, mova o card para Em produção quando começar a trabalhar."
      },
      {
        title: "Produza a arte e salve no Nextcloud",
        text:
          "Use a pasta do cliente e mantenha a versão final organizada no Nextcloud."
      },
      {
        title: "Anexe a arte no sistema",
        text:
          "Abra a peça, selecione o arquivo no Nextcloud e anexe a versão que será enviada para aprovação."
      },
      {
        title: "Envie para aprovação",
        text:
          "Depois que todas as peças da etapa estiverem prontas, o calendário segue para Aprovação da arte pelo cliente."
      }
    ]
  },
  {
    id: "alteracao",
    eyebrow: "ALTERAÇÃO",
    title: "Quando o cliente pede alteração",
    icon: FiRefreshCw,
    intro:
      "A peça volta para Ajustes e ganha prioridade operacional maior na fila.",
    steps: [
      {
        title: "Identifique o feedback",
        text:
          "Abra a demanda e leia exatamente o que o cliente pediu antes de editar a arte."
      },
      {
        title: "Replaneje se necessário",
        text:
          "Se o ajuste não couber no dia atual, use a Central de demandas para definir um novo dia de produção."
      },
      {
        title: "Faça a nova versão",
        text:
          "Atualize o arquivo no Nextcloud preservando a organização da pasta da demanda."
      },
      {
        title: "Anexe a versão corrigida",
        text:
          "Selecione a nova arte no sistema. A revisão fica registrada no histórico da demanda."
      },
      {
        title: "Reenvie para aprovação",
        text:
          "A peça volta para o cliente. O fluxo segue até a aprovação final."
      }
    ]
  },
  {
    id: "avulsa",
    eyebrow: "ARTE AVULSA",
    title: "Quando chega uma arte avulsa",
    icon: FiTool,
    intro:
      "Arte avulsa é uma demanda independente do calendário mensal, mas usa a mesma lógica de responsável, prazo e pontos.",
    steps: [
      {
        title: "A demanda entra como Solicitada",
        text:
          "Ela aparece em Artes avulsas, Meu dia e na Central de demandas para o designer responsável."
      },
      {
        title: "A pasta é preparada no Nextcloud",
        text:
          "O sistema cria automaticamente a estrutura da demanda dentro da pasta do cliente."
      },
      {
        title: "Atualize para Em produção",
        text:
          "Quando começar, mova o status para Em produção ou arraste o card pela Central."
      },
      {
        title: "Anexe a arte e envie para aprovação",
        text:
          "Use o seletor do Nextcloud para escolher o arquivo da demanda e altere o status para Em aprovação."
      },
      {
        title: "Se houver ajuste, volte para Ajustes solicitados",
        text:
          "Faça a revisão, anexe a nova versão e envie novamente para aprovação."
      },
      {
        title: "Finalize como Entregue",
        text:
          "Depois da aprovação e entrega, marque a arte como Entregue. Ela deixa de contar como WIP ativo."
      }
    ]
  },
  {
    id: "pre-calendario",
    eyebrow: "PRÉ-CALENDÁRIO",
    title: "Quando é hora de montar o calendário",
    icon: FiCalendar,
    intro:
      "O calendário começa como planejamento. Hoje, a montagem e o envio do pré-calendário são ações de ADMIN/DEV no sistema.",
    steps: [
      {
        title: "Crie o calendário do período",
        text:
          "Defina cliente, período, dias de postagem e prazos da operação."
      },
      {
        title: "Cadastre as publicações",
        text:
          "Para cada data, informe tema, headline, subheadline, legenda, tipo e formato. Use datas comemorativas e modelos de pauta como apoio."
      },
      {
        title: "Revise o pré-calendário",
        text:
          "Confira se todas as publicações estão completas, nas datas corretas e dentro do escopo do cliente."
      },
      {
        title: "Envie o pré-calendário para o cliente",
        text:
          "Ao clicar em Enviar pré-calendário, o fluxo entra em Pré-aprovação e o cliente recebe a visão para revisar."
      },
      {
        title: "Trate ajustes de planejamento",
        text:
          "Se o cliente solicitar mudanças, edite somente os itens sinalizados e reenvie o pré-calendário."
      },
      {
        title: "Após aprovação, começa a produção",
        text:
          "As peças aprovadas entram na fila de design. A partir daqui, o designer trabalha cada arte até a aprovação final."
      }
    ]
  }
];

export default async function DesignerFlowHelpPage() {
  const designer = await requireDesigner();

  return (
    <AppShell designer={designer} activeSection="help">
      <header className="page-header compact-header help-docs-header">
        <div>
          <span className="micro-label">AJUDA · FLUXO OPERACIONAL</span>
          <h1>Processo do designer</h1>
          <p>
            Passo a passo para saber o que fazer quando chega uma nova arte,
            uma alteração, uma arte avulsa e quando o calendário entra em
            planejamento e aprovação.
          </p>
        </div>
      </header>

      <HelpDocsNav active="designer" />

      <section className="help-role-note">
        <FiAlertCircle aria-hidden="true" />
        <div>
          <strong>Importante sobre o pré-calendário</strong>
          <p>
            No fluxo atual do sistema, criar publicações e enviar o
            pré-calendário são ações de ADMIN/DEV. O designer assume a produção
            depois que o briefing é aprovado, salvo quando um gestor
            redistribuir uma demanda diretamente para ele.
          </p>
        </div>
      </section>

      <nav className="help-flow-index" aria-label="Atalhos do fluxo">
        {flows.map((flow) => (
          <a href={`#${flow.id}`} key={flow.id}>
            <flow.icon aria-hidden="true" />
            <span>{flow.eyebrow}</span>
          </a>
        ))}
      </nav>

      <section className="help-docs-section">
        <div className="help-docs-section-head">
          <div>
            <span className="micro-label">ROTINA DIÁRIA</span>
            <h2>Por onde começar?</h2>
          </div>
        </div>

        <div className="help-daily-flow">
          <article>
            <span>1</span>
            <div>
              <strong>Abra Meu dia</strong>
              <p>
                Veja primeiro o que está urgente, atrasado, em alteração ou
                pronto para você produzir.
              </p>
            </div>
          </article>
          <FiArrowRight aria-hidden="true" />
          <article>
            <span>2</span>
            <div>
              <strong>Use a Central de demandas</strong>
              <p>
                Organize ordem, dia planejado e capacidade. Arraste cards quando
                a etapa mudar.
              </p>
            </div>
          </article>
          <FiArrowRight aria-hidden="true" />
          <article>
            <span>3</span>
            <div>
              <strong>Abra a demanda</strong>
              <p>
                Confira briefing e feedback antes de produzir ou alterar
                qualquer arquivo.
              </p>
            </div>
          </article>
        </div>
      </section>

      {flows.map((flow) => {
        const Icon = flow.icon;
        return (
          <section className="help-flow-section" id={flow.id} key={flow.id}>
            <div className="help-flow-section-head">
              <span className="help-flow-icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <span className="micro-label">{flow.eyebrow}</span>
                <h2>{flow.title}</h2>
                <p>{flow.intro}</p>
              </div>
            </div>

            <div className="help-step-list">
              {flow.steps.map((step, index) => (
                <article key={step.title}>
                  <span className="help-step-number">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="help-docs-section">
        <div className="help-docs-section-head">
          <div>
            <span className="micro-label">STATUS</span>
            <h2>Como interpretar a fila</h2>
          </div>
        </div>

        <div className="help-status-grid">
          <article>
            <FiClock aria-hidden="true" />
            <div>
              <strong>Aguardando</strong>
              <p>Demanda pronta para iniciar, mas ainda não começou.</p>
            </div>
          </article>
          <article>
            <FiTool aria-hidden="true" />
            <div>
              <strong>Em produção</strong>
              <p>Designer está trabalhando na arte.</p>
            </div>
          </article>
          <article>
            <FiCheckCircle aria-hidden="true" />
            <div>
              <strong>Aprovação</strong>
              <p>Arte enviada e aguardando retorno do cliente.</p>
            </div>
          </article>
          <article>
            <FiEdit3 aria-hidden="true" />
            <div>
              <strong>Ajustes</strong>
              <p>Cliente pediu alteração e a peça voltou para produção.</p>
            </div>
          </article>
          <article>
            <FiSend aria-hidden="true" />
            <div>
              <strong>Concluído</strong>
              <p>Arte aprovada, entregue ou pronta para seguir no fluxo.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="help-docs-final-cta">
        <FiLayers aria-hidden="true" />
        <div>
          <strong>Regra de bolso</strong>
          <p>
            Meu dia diz o que precisa ser feito. A Central de demandas organiza
            quando e por quem. O calendário mostra em qual etapa o cliente está.
          </p>
        </div>
        <Link href="/producao">
          Abrir Central de demandas
          <FiArrowRight aria-hidden="true" />
        </Link>
      </section>
    </AppShell>
  );
}
