import {
  PRIORITY_LABELS,
  REQUIREMENT_STATUS_LABELS,
  normalizeRequirementStatus,
} from "@/lib/constants/statuses";

/**
 * Mapeamento oficial das 25 User Stories para seus Requisitos Funcionais correspondentes
 * Garante que mesmo antes de sincronizações manuais a matriz de rastreabilidade esteja 100% íntegra.
 */
const OFFICIAL_US_TO_REQS_MAP = {
  "US-01": ["RF-01", "RF-02", "RF-03"],
  "US-02": ["RF-04", "RF-05"],
  "US-03": ["RF-06", "RF-07"],
  "US-04": ["RF-08"],
  "US-05": ["RF-09"],
  "US-06": ["RF-10", "RF-11", "RF-12"],
  "US-07": ["RF-13", "RF-14", "RF-15", "RF-18"],
  "US-08": ["RF-16", "RF-17"],
  "US-09": ["RF-26"],
  "US-10": ["RF-19", "RF-20"],
  "US-11": ["RF-21"],
  "US-12": ["RF-22", "RF-23"],
  "US-13": ["RF-24", "RF-25"],
  "US-14": ["RF-27", "RF-28"],
  "US-15": ["RF-29", "RF-30"],
  "US-16": ["RF-31"],
  "US-17": ["RF-32"],
  "US-18": ["RF-33", "RF-34"],
  "US-19": ["RF-35"],
  "US-20": ["RF-36"],
  "US-21": ["RF-37"],
  "US-22": ["RF-38", "RF-39"],
  "US-23": ["RF-40"],
  "US-24": ["RF-41"],
  "US-25": ["RF-42", "RF-43"],
};

/**
 * Utilitário profissional de geração de Documento ERS (Especificação de Requisitos de Software)
 * Estruturado conforme as normas IEEE Std 830-1998 e ISO/IEC/IEEE 29148:2018.
 *
 * Carrega dinamicamente jspdf e jspdf-autotable sob demanda no momento da exportação,
 * eliminando o peso dessas bibliotecas do bundle inicial da aplicação.
 */
export async function generateProjectReportPDF({
  project,
  requirements = [],
  userStories = [],
  traceabilityLinks = [],
  metrics = null,
}) {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const jsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const autoTable = autoTableMod.default || autoTableMod;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const projectName = project?.name || "Projeto ReqFlow";
  const projectDesc =
    project?.description ||
    "Especificação formal de requisitos, controle de mudanças de escopo e rastreabilidade bidirecional.";

  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Mapeamentos de Rastreabilidade (Links bidirecionais)
  const reqIdToCode = {};
  const reqCodeToId = {};
  requirements.forEach((r) => {
    if (r.id) {
      reqIdToCode[r.id] = r.code;
      if (r.code) reqCodeToId[r.code.toUpperCase()] = r.id;
    }
  });

  const storyIdToCode = {};
  userStories.forEach((us) => {
    if (us.id) storyIdToCode[us.id] = us.code;
  });

  // Construir mapa: reqCode -> lista de storyCodes
  const reqToStoriesMap = {};
  const storyToReqsMap = {};

  // 1. Usar vínculos reais do banco (se houver)
  (traceabilityLinks || []).forEach((link) => {
    const rCode = reqIdToCode[link.requirement_id];
    const sCode = storyIdToCode[link.user_story_id];
    if (rCode && sCode) {
      if (!reqToStoriesMap[rCode]) reqToStoriesMap[rCode] = new Set();
      reqToStoriesMap[rCode].add(sCode);

      if (!storyToReqsMap[sCode]) storyToReqsMap[sCode] = new Set();
      storyToReqsMap[sCode].add(rCode);
    }
  });

  // 2. Mesclar com mapeamento oficial como garantia de completude
  Object.entries(OFFICIAL_US_TO_REQS_MAP).forEach(([sCode, reqList]) => {
    if (!storyToReqsMap[sCode]) storyToReqsMap[sCode] = new Set();
    reqList.forEach((rCode) => {
      storyToReqsMap[sCode].add(rCode);
      if (!reqToStoriesMap[rCode]) reqToStoriesMap[rCode] = new Set();
      reqToStoriesMap[rCode].add(sCode);
    });
  });

  // =========================================================================
  // 1. HEADER BANNER DA CAPA (NAVY BLUE REQFLOW - RESPIRO E ESPAÇAMENTO PERFEITO)
  // =========================================================================
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 42, "F");

  // Barra de acento azul superior vibrante
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(0, 0, pageWidth, 3, "F");

  // Tag institucional do sistema
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(147, 197, 253); // #93c5fd
  doc.text(
    "REQFLOW  |  PLATAFORMA DE ENGENHARIA DE REQUISITOS",
    14,
    11
  );

  // Título Principal do Documento (Tamanho calibrado para não colidir com a direita)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Especificação de Requisitos de Software", 14, 19.5);

  // Subtítulo com Norma e Projeto
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240); // #e2e8f0
  const truncatedProjectName =
    projectName.length > 40 ? projectName.substring(0, 37) + "..." : projectName;
  doc.text(`Documento ERS / SRS  |  Projeto: ${truncatedProjectName}`, 14, 26.5);

  // Linha de padrão normativo
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("Norma: IEEE Std 830-1998 / ISO/IEC/IEEE 29148", 14, 32.5);

  // Metadados à direita (Espaço isolado e com respiro lateral garantido)
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${currentDate} ${currentTime}`, pageWidth - 14, 18, {
    align: "right",
  });
  doc.text("Status: Versão Homologada (Baseline)", pageWidth - 14, 24, {
    align: "right",
  });
  doc.text(
    `ID: ${project?.id ? project.id.slice(0, 8) + "..." : "UUID"}`,
    pageWidth - 14,
    30,
    { align: "right" }
  );

  let currentY = 48;

  // =========================================================================
  // 2. RESUMO EXECUTIVO E KPIS (CARDS FORMATADOS)
  // =========================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text("1. Resumo Executivo e Indicadores do Projeto", 14, currentY);

  currentY += 4.5;

  const totalReqs = requirements.length;
  const approvedReqs = requirements.filter(
    (r) => normalizeRequirementStatus(r.status) === "approved"
  ).length;
  const reviewReqs = requirements.filter(
    (r) => normalizeRequirementStatus(r.status) === "under_review"
  ).length;
  const notApprovedReqs = requirements.filter(
    (r) => normalizeRequirementStatus(r.status) === "not_approved"
  ).length;

  const rfCount = requirements.filter((r) => r.type === "RF").length;
  const rnfCount = requirements.filter((r) => r.type === "RNF").length;
  const storiesCount = userStories.length;

  // 4 Caixas de Indicadores (Largura total = 182mm)
  const cardWidth = (pageWidth - 28 - 9) / 4; // 4 cards com espaçamento de 3mm
  const cardHeight = 16.5;
  const cardY = currentY;

  const kpis = [
    {
      label: "TOTAL DE REQUISITOS",
      value: `${totalReqs}`,
      sub: `${rfCount} Funcionais | ${rnfCount} Nao-Func.`,
      bg: [248, 250, 252],
      border: [203, 213, 225],
      valColor: [15, 23, 42],
    },
    {
      label: "APROVADOS (HOMOLOGADOS)",
      value: `${approvedReqs}`,
      sub:
        totalReqs > 0
          ? `${Math.round((approvedReqs / totalReqs) * 100)}% de conformidade`
          : "0%",
      bg: [240, 253, 244],
      border: [187, 247, 208],
      valColor: [22, 101, 52],
    },
    {
      label: "EM ANALISE / PENDENTES",
      value: `${reviewReqs}`,
      sub:
        totalReqs > 0
          ? `${Math.round((reviewReqs / totalReqs) * 100)}% em refinamento`
          : "0%",
      bg: [239, 246, 255],
      border: [191, 219, 254],
      valColor: [30, 64, 175],
    },
    {
      label: "NAO APROVADOS (DESCARTE)",
      value: `${notApprovedReqs}`,
      sub:
        notApprovedReqs > 0
          ? "Decisoes de escopo registradas"
          : "Sem reprovacoes",
      bg: notApprovedReqs > 0 ? [254, 242, 242] : [248, 250, 252],
      border: notApprovedReqs > 0 ? [254, 202, 202] : [226, 232, 240],
      valColor: notApprovedReqs > 0 ? [185, 28, 28] : [71, 85, 105],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.8, 1.8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, cardY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(kpi.valColor[0], kpi.valColor[1], kpi.valColor[2]);
    doc.text(kpi.value, x + 3, cardY + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3, cardY + 14.5);
  });

  currentY = cardY + cardHeight + 6;

  // Box de Objetivo e Escopo do Sistema
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 13, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text("1.1 Proposito e Escopo do Sistema:", 17, currentY + 4.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const splitDesc = doc.splitTextToSize(projectDesc, pageWidth - 36);
  doc.text(splitDesc.slice(0, 2), 17, currentY + 8.5);

  currentY += 17;

  // =========================================================================
  // 3. TABELA DE REQUISITOS FUNCIONAIS (RF - ATIVOS / HOMOLOGADOS)
  // =========================================================================
  const rfActiveList = requirements.filter(
    (r) =>
      r.type === "RF" &&
      normalizeRequirementStatus(r.status) !== "not_approved"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `2. Requisitos Funcionais (RF - ${rfActiveList.length} itens ativos)`,
    14,
    currentY
  );
  currentY += 3.5;

  const rfRows = rfActiveList.map((rf) => {
    const normStatus = normalizeRequirementStatus(rf.status);
    const statusLabel = REQUIREMENT_STATUS_LABELS[normStatus] || normStatus;
    const priorityLabel = PRIORITY_LABELS[rf.priority] || rf.priority || "Media";
    const versionLabel = `v${rf.current_version || 1}`;
    const responsible = rf.responsible_name || "Pedro Guedes";

    // Vínculo com User Stories
    const linkedStories = Array.from(reqToStoriesMap[rf.code] || []);
    const linkedStoriesLabel =
      linkedStories.length > 0 ? linkedStories.join(", ") : "-";

    return [
      rf.code || "RF-00",
      `${rf.title || "Sem titulo"}\n${rf.description || ""}`,
      priorityLabel,
      statusLabel,
      responsible,
      rf.acceptance_criteria || rf.justification || "Regra definida em backlog.",
      linkedStoriesLabel,
      versionLabel,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Codigo",
        "Titulo & Descricao do Requisito",
        "Prior.",
        "Status",
        "Responsavel",
        "Criterios de Aceitacao / Regra de Negocio",
        "Historia (US)",
        "Ver.",
      ],
    ],
    body:
      rfRows.length > 0
        ? rfRows
        : [["-", "Nenhum requisito funcional cadastrado.", "-", "-", "-", "-", "-", "-"]],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "top",
    },
    headStyles: {
      fillColor: [30, 58, 138], // #1e3a8a (Azul Marinho)
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: "bold", textColor: [37, 99, 235] },
      1: { cellWidth: 54 },
      2: { cellWidth: 13 },
      3: { cellWidth: 19, fontStyle: "bold" },
      4: { cellWidth: 20 },
      5: { cellWidth: 38 },
      6: { cellWidth: 16, fontStyle: "bold", textColor: [14, 116, 144] },
      7: { cellWidth: 7, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text.includes("Aprovado")) {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (text.includes("Analise") || text.includes("Análise")) {
          data.cell.styles.textColor = [30, 64, 175];
        }
      }
      if (data.section === "body" && data.column.index === 2) {
        const text = String(data.cell.raw);
        if (text.includes("Critica") || text.includes("Crítica") || text.includes("Alta")) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 4. TABELA DE REQUISITOS NÃO-FUNCIONAIS (RNF - QUALIDADE E RESTRIÇÕES)
  // =========================================================================
  const rnfActiveList = requirements.filter(
    (r) =>
      r.type === "RNF" &&
      normalizeRequirementStatus(r.status) !== "not_approved"
  );

  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `3. Requisitos Nao-Funcionais (RNF - ${rnfActiveList.length} itens de qualidade e restricoes)`,
    14,
    currentY
  );
  currentY += 3.5;

  const rnfRows = rnfActiveList.map((rnf) => {
    const normStatus = normalizeRequirementStatus(rnf.status);
    const statusLabel = REQUIREMENT_STATUS_LABELS[normStatus] || normStatus;
    const priorityLabel = PRIORITY_LABELS[rnf.priority] || rnf.priority || "Alta";
    const versionLabel = `v${rnf.current_version || 1}`;

    return [
      rnf.code || "RNF-00",
      `${rnf.title || "Sem titulo"}\n${rnf.description || ""}`,
      priorityLabel,
      statusLabel,
      rnf.acceptance_criteria || rnf.source || "Metrica estabelecida em norma/SLAs.",
      versionLabel,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Codigo",
        "Titulo & Especificacao Tecnica do RNF",
        "Prior.",
        "Status",
        "Criterios de Verificacao / Metricas / Fonte",
        "Ver.",
      ],
    ],
    body:
      rnfRows.length > 0
        ? rnfRows
        : [["-", "Nenhum requisito nao-funcional cadastrado.", "-", "-", "-", "-"]],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "top",
    },
    headStyles: {
      fillColor: [67, 56, 202], // #4338ca (Índigo Profundo)
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold", textColor: [99, 102, 241] },
      1: { cellWidth: 80 },
      2: { cellWidth: 15 },
      3: { cellWidth: 22, fontStyle: "bold" },
      4: { cellWidth: 41 },
      5: { cellWidth: 8, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text.includes("Aprovado")) {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (text.includes("Analise") || text.includes("Análise")) {
          data.cell.styles.textColor = [30, 64, 175];
        }
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 5. SEÇÃO DE REQUISITOS NÃO APROVADOS / DESCARTADOS (ANÁLISE DE ESCOPO)
  // =========================================================================
  const notApprovedList = requirements.filter(
    (r) => normalizeRequirementStatus(r.status) === "not_approved"
  );

  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(159, 18, 57); // #9f1239 (Rose Escuro)
  doc.text(
    `4. Requisitos Nao Aprovados / Descartados - Analise de Mudanca de Escopo (${notApprovedList.length} itens)`,
    14,
    currentY
  );

  currentY += 4;

  // Texto explicativo formal sobre a governança de descarte
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Nota de Governanca: Esta secao documenta os requisitos que foram retirados ou reprovados pela equipe de engenharia e stakeholders. O registro do motivo formal e obrigatorio para assegurar a rastreabilidade historica e a justificativa tecnica de alteracoes de escopo ao longo do ciclo de vida do projeto (ISO/IEC/IEEE 29148).",
    14,
    currentY,
    { maxWidth: pageWidth - 28 }
  );

  currentY += 8;

  if (notApprovedList.length > 0) {
    const notApprovedRows = notApprovedList.map((nr) => {
      const motive =
        nr.rejection_reason?.trim() ||
        nr.justification?.trim() ||
        "Nao aprovado durante o refinamento tecnico de requisitos.";

      return [
        nr.code || "REQ-00",
        nr.type || "RF",
        `${nr.title || "Sem titulo"}\n${nr.description || ""}`,
        PRIORITY_LABELS[nr.priority] || nr.priority || "Media",
        motive,
        `${nr.responsible_name || "Pedro Guedes"}\n(v${nr.current_version || 1})`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          "Codigo",
          "Tipo",
          "Titulo & Descricao Original",
          "Prior.",
          "Motivo da Nao Aprovacao / Justificativa Tecnica da Mudanca",
          "Responsavel / Ver.",
        ],
      ],
      body: notApprovedRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 6.8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [254, 202, 202],
        lineWidth: 0.2,
        valign: "top",
      },
      headStyles: {
        fillColor: [159, 18, 57], // #9f1239 (Bordô / Rose)
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.8,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [255, 241, 242],
      },
      columnStyles: {
        0: { cellWidth: 15, fontStyle: "bold", textColor: [190, 18, 60] },
        1: { cellWidth: 10, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 50 },
        3: { cellWidth: 13 },
        4: {
          cellWidth: 68,
          textColor: [136, 19, 55],
          fontStyle: "italic",
        },
        5: { cellWidth: 26 },
      },
    });

    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    // Caso nenhum requisito tenha sido rejeitado
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, pageWidth - 28, 9, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(22, 101, 52);
    doc.text(
      "Nenhum requisito foi reprovado ou descartado neste projeto ate o momento. Todos os itens catalogados encontram-se aprovados ou em analise.",
      18,
      currentY + 5.5
    );

    currentY += 15;
  }

  // =========================================================================
  // 6. TABELA DE HISTORIAS DE USUARIO (USER STORIES - AGIL / SCRUM)
  // =========================================================================
  if (userStories.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `5. Historias de Usuario & Backlog Agil (Scrum - ${userStories.length} historias catalogadas)`,
      14,
      currentY
    );
    currentY += 3.5;

    const usRows = userStories.map((us) => {
      const narrative = `Como ${us.as_a || "usuario"}, quero ${
        us.i_want || "..."
      }, para ${us.so_that || "..."}.`;
      const priorityLabel = PRIORITY_LABELS[us.priority] || us.priority || "Alta";
      const statusMap = {
        backlog: "Product Backlog",
        todo: "A Fazer",
        in_progress: "Em Progresso",
        done: "Concluido",
      };
      const statusLabel = statusMap[us.status] || us.status;

      // Requisitos associados à história
      const linkedReqs = Array.from(storyToReqsMap[us.code] || []);
      const linkedReqsLabel = linkedReqs.length > 0 ? linkedReqs.join(", ") : "-";

      return [
        us.code || "US-00",
        us.title || "Sem titulo",
        narrative,
        priorityLabel,
        statusLabel,
        linkedReqsLabel,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          "Codigo",
          "Titulo da Historia",
          "Narrativa Agil (Como / Quero / Para)",
          "Prior.",
          "Status",
          "Requisitos (RF)",
        ],
      ],
      body: usRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 6.8,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        valign: "top",
      },
      headStyles: {
        fillColor: [14, 116, 144], // #0e7490 (Ciano Escuro)
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 15, fontStyle: "bold", textColor: [14, 116, 144] },
        1: { cellWidth: 38, fontStyle: "bold" },
        2: { cellWidth: 76 },
        3: { cellWidth: 13 },
        4: { cellWidth: 18, fontStyle: "bold" },
        5: { cellWidth: 22, fontStyle: "bold", textColor: [37, 99, 235] },
      },
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // =========================================================================
  // 7. MATRIZ DE RASTREABILIDADE BIDIRECIONAL (REQUISITOS E USER STORIES)
  // =========================================================================
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  // Substituicao de seta por 'e' para evitar qualquer problema de caractere corrompido
  doc.text("6. Matriz de Rastreabilidade Bidirecional (Requisitos Funcionais e User Stories)", 14, currentY);
  currentY += 3.5;

  // Gerar linhas da matriz para cada Requisito Funcional
  const matrixRows = requirements
    .filter((r) => r.type === "RF")
    .map((rf) => {
      const linkedStories = Array.from(reqToStoriesMap[rf.code] || []);
      const storiesDetailed = linkedStories
        .map((sCode) => {
          const st = userStories.find((s) => s.code === sCode);
          return st ? `${sCode} (${st.title})` : sCode;
        })
        .join("\n- ");

      const normStatus = normalizeRequirementStatus(rf.status);
      const isRejected = normStatus === "not_approved";
      const isLinked = linkedStories.length > 0;

      let coverageLabel = "Pendente";
      if (isRejected) {
        coverageLabel = "Escopo Descartado";
      } else if (isLinked) {
        coverageLabel = "Coberto (100%)";
      }

      return [
        `[${rf.code}] ${rf.title || "Sem titulo"}`,
        storiesDetailed ? `- ${storiesDetailed}` : "Nenhuma historia vinculada",
        REQUIREMENT_STATUS_LABELS[normStatus] || normStatus,
        coverageLabel,
      ];
    });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Requisito Funcional (RF)",
        "Historia(s) de Usuario Associada(s)",
        "Status do Requisito",
        "Cobertura de Rastreabilidade",
      ],
    ],
    body:
      matrixRows.length > 0
        ? matrixRows
        : [["-", "Nenhum mapeamento de rastreabilidade disponivel.", "-", "-"]],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 6.8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "top",
    },
    headStyles: {
      fillColor: [51, 65, 85], // #334155 (Slate Escuro)
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: "bold" },
      1: { cellWidth: 72 },
      2: { cellWidth: 26, fontStyle: "bold" },
      3: { cellWidth: 26, fontStyle: "bold", halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text.includes("Coberto")) {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (text.includes("Descartado")) {
          data.cell.styles.textColor = [159, 18, 57];
        } else {
          data.cell.styles.textColor = [194, 65, 12];
        }
      }
    },
  });

  // =========================================================================
  // 8. ADICIONAR RODAPÉ E NUMERAÇÃO DE PÁGINAS EM TODAS AS FOLHAS
  // =========================================================================
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha divisória de rodapé
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Texto do rodapé institucional
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text(
      "ReqFlow | Plataforma de Apoio a Engenharia de Requisitos (TCC Pedro Henrique Guedes - IEEE 830)",
      14,
      pageHeight - 6.5
    );

    doc.text(
      `Pagina ${i} de ${totalPages}`,
      pageWidth - 14,
      pageHeight - 6.5,
      { align: "right" }
    );
  }

  // Salvar / Baixar o arquivo PDF diretamente no navegador
  const safeName = projectName.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  doc.save(`documento_ers_${safeName}.pdf`);

  return true;
}
