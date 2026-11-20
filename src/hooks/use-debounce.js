"use client";

import { useState, useEffect } from "react";

/**
 * Hook para aplicar debounce em valores que disparam requisições ou filtros pesados.
 * @param {any} value - O valor a sofrer debounce (ex: texto de busca)
 * @param {number} delay - Tempo de espera em milissegundos (padrão: 300ms)
 * @returns {any} O valor atualizado somente após o delay de inatividade
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
