/**
 * Validação Pedagógica de Completude de Requisitos
 * Auxilia estudantes a identificarem requisitos vagos ou incompletos.
 */
export function checkRequirementCompleteness(req) {
  if (!req) return { isComplete: false, missingFields: [] };

  const missingFields = [];

  if (!req.description || req.description.trim().length < 10) {
    missingFields.push("Descrição detalhada");
  }

  if (!req.justification || req.justification.trim().length === 0) {
    missingFields.push("Justificativa da necessidade");
  }

  if (!req.source || req.source.trim().length === 0) {
    missingFields.push("Fonte / Stakeholder de origem");
  }

  if (!req.acceptance_criteria || req.acceptance_criteria.trim().length === 0) {
    missingFields.push("Critérios de aceitação verificáveis");
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    alertMessage:
      missingFields.length > 0
        ? `Requisito incompleto: preencha ${missingFields.join(", ")}.`
        : null,
  };
}
