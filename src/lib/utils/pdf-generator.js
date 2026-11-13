import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PRIORITY_LABELS,
  REQUIREMENT_STATUS_LABELS,
  normalizeRequirementStatus,
} from "@/lib/constants/statuses";

/**
 * Utilitário profissional de geração de PDF para o ReqFlow
 * Cria um documento diagramado, organizado e esteticamente polido (padrão IEEE 830).
 */
export function generateProjectReportPDF({
  project,
  requirements = [],
  userStories = [],
  metrics = null,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const projectName = project?.name || "Projeto de Software";
  const projectDesc = project?.description || "Especificação de Requisitos e Rastreabilidade Ágil.";
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // =========================================================================
  // 1. HEADER BANNER DA CAPA (NAVY BLUE REQFLOW)
  // =========================================================================
  doc.setFillColor(17, 34, 64); // #112240
  doc.rect(0, 0, pageWidth, 42, "F");

  // Barra de acento azul superior
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(0, 0, pageWidth, 3, "F");

  // Tag do sistema
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253); // #93c5fd
  doc.text("REQFLOW  •  PLATAFORMA DE APOIO À ENGENHARIA DE REQUISITOS", 14, 12);

  // Título Principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Especificação de Requisitos de Software (SRS)", 14, 21);

  // Subtítulo com Nome do Projeto
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240); // #e2e8f0
  const truncatedProjectName =
    projectName.length > 55 ? projectName.substring(0, 52) + "..." : projectName;
  doc.text(`Projeto: ${truncatedProjectName}`, 14, 28);

  // Metadados à direita
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${currentDate} às ${currentTime}`, pageWidth - 14, 20, { align: "right" });
  doc.text("Padrão: IEEE Std 830-1998 / ISO 29148", pageWidth - 14, 25, { align: "right" });
  doc.text(`Identificador: ${project?.id ? project.id.slice(0, 8) + "..." : "UUID"}`, pageWidth - 14, 30, { align: "right" });

  let currentY = 48;

  // =========================================================================
  // 2. RESUMO EXECUTIVO E KPIS (CARDS FORMATADOS)
  // =========================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text("1. Resumo Executivo e Métricas do Projeto", 14, currentY);

  currentY += 4;

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

  // 4 Caixas de Indicadores
  const cardWidth = (pageWidth - 28 - 9) / 4; // 4 cards com espaçamento de 3mm
  const cardHeight = 16;
  const cardY = currentY;

  const kpis = [
    {
      label: "TOTAL DE REQUISITOS",
      value: `${totalReqs}`,
      sub: `${rfCount} RF  •  ${rnfCount} RNF`,
      bg: [248, 250, 252],
      border: [203, 213, 225],
      valColor: [15, 23, 42],
    },
    {
      label: "APROVADOS (100%)",
      value: `${approvedReqs}`,
      sub: totalReqs > 0 ? `${Math.round((approvedReqs / totalReqs) * 100)}% homologado` : "0%",
      bg: [240, 253, 244],
      border: [187, 247, 208],
      valColor: [22, 101, 52],
    },
    {
      label: "EM ANÁLISE / PENDENTE",
      value: `${reviewReqs}`,
      sub: totalReqs > 0 ? `${Math.round((reviewReqs / totalReqs) * 100)}% em revisão` : "0%",
      bg: [239, 246, 255],
      border: [191, 219, 254],
      valColor: [30, 64, 175],
    },
    {
      label: "HISTÓRIAS DE USUÁRIO",
      value: `${storiesCount}`,
      sub: `${notApprovedReqs} req. não aprovado(s)`,
      bg: [254, 242, 242],
      border: [254, 202, 202],
      valColor: [153, 27, 27],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, cardY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(kpi.valColor[0], kpi.valColor[1], kpi.valColor[2]);
    doc.text(kpi.value, x + 3, cardY + 9.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3, cardY + 13.5);
  });

  currentY = cardY + cardHeight + 6;

  // Descrição do Projeto / Escopo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 12, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text("Objetivo e Escopo do Sistema:", 17, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const splitDesc = doc.splitTextToSize(projectDesc, pageWidth - 36);
  doc.text(splitDesc.slice(0, 2), 17, currentY + 8);

  currentY += 16;

  // =========================================================================
  // 3. TABELA DE REQUISITOS FUNCIONAIS (RF)
  // =========================================================================
  const rfList = requirements.filter((r) => r.type === "RF");

  const rfRows = rfList.map((rf) => {
    const normStatus = normalizeRequirementStatus(rf.status);
    const statusLabel = REQUIREMENT_STATUS_LABELS[normStatus] || normStatus;
    const priorityLabel = PRIORITY_LABELS[rf.priority] || rf.priority;
    const versionLabel = `v${rf.current_version || 1}`;
    const responsible = rf.responsible_name || "Não atribuído";

    return [
      rf.code || "REQ-000",
      `${rf.title || "Sem título"}\n${rf.description || ""}`,
      priorityLabel,
      statusLabel,
      responsible,
      rf.acceptance_criteria || rf.justification || "N/A",
      versionLabel,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Código",
        "Título & Descrição do Requisito",
        "Prioridade",
        "Status",
        "Responsável",
        "Critérios de Aceitação / Justificativa",
        "Ver.",
      ],
    ],
    body:
      rfRows.length > 0
        ? rfRows
        : [["—", "Nenhum requisito funcional cadastrado.", "—", "—", "—", "—", "—"]],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "top",
    },
    headStyles: {
      fillColor: [30, 58, 138], // #1e3a8a
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.2,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #f8fafc
    },
    columnStyles: {
      0: { cellWidth: 17, fontStyle: "bold", textColor: [37, 99, 235] },
      1: { cellWidth: 62 },
      2: { cellWidth: 16 },
      3: { cellWidth: 22, fontStyle: "bold" },
      4: { cellWidth: 24 },
      5: { cellWidth: 32 },
      6: { cellWidth: 9, halign: "center" },
    },
    didDrawPage: (data) => {
      // Título da seção logo antes da tabela na primeira página da tabela
      if (data.pageNumber === 1 || data.cursor.y < 70) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
      }
    },
    didParseCell: (data) => {
      // Estilização semântica da coluna de Status
      if (data.section === "body" && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text.includes("Aprovado") && !text.includes("Não")) {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (text.includes("Em Análise")) {
          data.cell.styles.textColor = [30, 64, 175];
        } else if (text.includes("Não Aprovado")) {
          data.cell.styles.textColor = [185, 28, 28];
        }
      }
      // Estilização semântica da coluna de Prioridade
      if (data.section === "body" && data.column.index === 2) {
        const text = String(data.cell.raw);
        if (text.includes("Crítica") || text.includes("Alta")) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 4. TABELA DE REQUISITOS NÃO-FUNCIONAIS (RNF)
  // =========================================================================
  const rnfList = requirements.filter((r) => r.type === "RNF");

  // Se o espaço restante for menor que 35mm, quebra página
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Requisitos Não-Funcionais (RNF — Qualidade e Restrições)", 14, currentY);
  currentY += 3;

  const rnfRows = rnfList.map((rnf) => {
    const normStatus = normalizeRequirementStatus(rnf.status);
    const statusLabel = REQUIREMENT_STATUS_LABELS[normStatus] || normStatus;
    const priorityLabel = PRIORITY_LABELS[rnf.priority] || rnf.priority;
    const versionLabel = `v${rnf.current_version || 1}`;

    return [
      rnf.code || "RNF-000",
      `${rnf.title || "Sem título"}\n${rnf.description || ""}`,
      priorityLabel,
      statusLabel,
      rnf.acceptance_criteria || rnf.source || "N/A",
      versionLabel,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Código",
        "Título & Descrição do RNF",
        "Prioridade",
        "Status",
        "Critérios de Verificação / Fonte",
        "Ver.",
      ],
    ],
    body:
      rnfRows.length > 0
        ? rnfRows
        : [["—", "Nenhum requisito não-funcional cadastrado.", "—", "—", "—", "—"]],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "top",
    },
    headStyles: {
      fillColor: [67, 56, 202], // #4338ca (Índigo/Roxo elegante)
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.2,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 17, fontStyle: "bold", textColor: [99, 102, 241] },
      1: { cellWidth: 84 },
      2: { cellWidth: 18 },
      3: { cellWidth: 24, fontStyle: "bold" },
      4: { cellWidth: 30 },
      5: { cellWidth: 9, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const text = String(data.cell.raw);
        if (text.includes("Aprovado") && !text.includes("Não")) {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (text.includes("Em Análise")) {
          data.cell.styles.textColor = [30, 64, 175];
        }
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // 5. TABELA DE HISTÓRIAS DE USUÁRIO (USER STORIES — ÁGIL)
  // =========================================================================
  if (userStories.length > 0) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("4. Histórias de Usuário & Execução Ágil (Scrum)", 14, currentY);
    currentY += 3;

    const usRows = userStories.map((us) => {
      const narrative = `Como ${us.as_a || "usuário"}, quero ${us.i_want || "..."}, para ${us.so_that || "..."}.`;
      const priorityLabel = PRIORITY_LABELS[us.priority] || us.priority || "Média";
      const statusMap = {
        backlog: "Backlog",
        todo: "A Fazer",
        in_progress: "Em Progresso",
        done: "Concluído",
      };
      const statusLabel = statusMap[us.status] || us.status;

      return [
        us.code || "US-00",
        us.title || "Sem título",
        narrativa,
        priorityLabel,
        statusLabel,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Código", "Título da História", "Narrativa Ágil (Como / Quero / Para)", "Prioridade", "Status"]],
      body: usRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 7.2,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        valign: "top",
      },
      headStyles: {
        fillColor: [14, 116, 144], // #0e7490 (Ciano Escuro)
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: "bold", textColor: [14, 116, 144] },
        1: { cellWidth: 42, fontStyle: "bold" },
        2: { cellWidth: 88 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18, fontStyle: "bold" },
      },
    });
  }

  // =========================================================================
  // 6. ADICIONAR RODAPÉ E NUMERAÇÃO DE PÁGINAS EM TODAS AS FOLHAS
  // =========================================================================
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha divisória de rodapé
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Texto do rodapé
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text(
      "ReqFlow  •  Plataforma de Apoio à Engenharia de Requisitos (TCC Pedro Henrique Guedes)",
      14,
      pageHeight - 6.5
    );

    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 14,
      pageHeight - 6.5,
      { align: "right" }
    );
  }

  // Salvar / Baixar o arquivo PDF diretamente no navegador
  const safeName = projectName.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  doc.save(`relatorio_requisitos_${safeName}.pdf`);

  return true;
}
