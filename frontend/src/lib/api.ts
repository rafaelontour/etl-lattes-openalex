const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface PesquisadorResumo {
  lattes_id: string;
  nome_completo: string;
  orcid_id: string | null;
  indice_h: number | null;
  indice_i10: number | null;
  qtd_producoes: number | null;
  qtd_citacoes_pesquisador: number | null;
  instituicao_empresa: string | null;
  nacionalidade: string | null;
}

export interface PesquisadorDetalhe extends PesquisadorResumo {
  resumo_cv: string | null;
  nome_orgao: string | null;
  data_atualizacao_lattes: string | null;
  id_photo_lattes: string | null;
}

export interface Formacao {
  tipo_formacao: string | null;
  nome_curso: string | null;
  nome_instituicao: string | null;
  ano_inicio: number | null;
  ano_conclusao: number | null;
  nome_orientador: string | null;
}

export interface AreaAtuacao {
  nome_grande_area: string | null;
  nome_area: string | null;
  nome_sub_area: string | null;
  nome_especialidade: string | null;
}

export interface ProducaoResumo {
  openalex_id: string;
  titulo: string | null;
  ano_publicacao: number | null;
  tipo_producao: string | null;
  qtd_citacoes_producao: number | null;
  journal_name: string | null;
  idioma: string | null;
  pesquisador: string | null;
}

export interface ProducaoDetalhe extends ProducaoResumo {
  doi: string | null;
  abstract: string | null;
  qtd_referencias_producao: number | null;
  issn: string | null;
  palavras_chave: string | null;
}

export interface Stats {
  total_pesquisadores: number;
  total_producoes: number;
  total_periodicos: number;
  pesquisadores_com_producao: number;
  total_citacoes: number;
  ano_min: number | null;
  ano_max: number | null;
}

export interface ResultadoBusca {
  openalex_id: string | null;
  titulo: string | null;
  abstract: string | null;
  ano_publicacao: number | null;
  tipo_producao: string | null;
  journal_name: string | null;
  score: number | null;
  pesquisador: string | null;
  lattes_id: string | null;
  tipo_resultado: string;
  doi: string | null;
  eh_acesso_aberto: boolean | null;
}

export interface Sugestao {
  texto: string;
  tipo: string;
}

export const api = {
  pesquisadores: {
    listar: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params) : "";
      return fetchAPI<PesquisadorResumo[]>(`/pesquisadores${qs}`);
    },
    obter: (id: string) => fetchAPI<PesquisadorDetalhe>(`/pesquisadores/${id}`),
    formacao: (id: string) => fetchAPI<Formacao[]>(`/pesquisadores/${id}/formacao`),
    areas: (id: string) => fetchAPI<AreaAtuacao[]>(`/pesquisadores/${id}/areas`),
    producoes: (id: string, params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params) : "";
      return fetchAPI<ProducaoResumo[]>(`/pesquisadores/${id}/producoes${qs}`);
    },
  },
  producoes: {
    listar: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params) : "";
      return fetchAPI<ProducaoResumo[]>(`/producoes${qs}`);
    },
    obter: (id: string) => fetchAPI<ProducaoDetalhe>(`/producoes/${encodeURIComponent(id)}`),
    tipos: () => fetchAPI<string[]>("/producoes/tipos"),
    anos: () => fetchAPI<number[]>("/producoes/anos"),
  },
  busca: {
    vetorial: (texto: string, filtros?: Record<string, unknown>, limite = 20) =>
      fetchAPI<ResultadoBusca[]>("/busca", {
        method: "POST",
        body: JSON.stringify({ texto, filtros, limite }),
      }),
    natural: (pergunta: string, limite = 20) =>
      fetchAPI<{ pergunta: string; resultados: ResultadoBusca[] }>("/busca/natural", {
        method: "POST",
        body: JSON.stringify({ pergunta, limite }),
      }),
    sugestoes: (q: string, tipo: string) =>
      fetchAPI<Sugestao[]>(`/busca/sugestoes?q=${encodeURIComponent(q)}&tipo=${encodeURIComponent(tipo)}`),
  },
  stats: () => fetchAPI<Stats>("/stats"),
};
