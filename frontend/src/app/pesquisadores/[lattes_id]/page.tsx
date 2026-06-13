"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, PesquisadorDetalhe, Formacao, AreaAtuacao, ProducaoResumo, ProducaoDetalhe } from "@/lib/api";
import {
  ArrowLeft,
  GraduationCap,
  Globe,
  Building2,
  BookOpen,
  Hash,
  Quote,
  Award,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export default function PesquisadorDetalhePage() {
  const { lattes_id } = useParams<{ lattes_id: string }>();
  const [pesquisador, setPesquisador] = useState<PesquisadorDetalhe | null>(null);
  const [formacao, setFormacao] = useState<Formacao[]>([]);
  const [areas, setAreas] = useState<AreaAtuacao[]>([]);
  const [producoes, setProducoes] = useState<ProducaoResumo[]>([]);
  const [resumoExpandido, setResumoExpandido] = useState(false);
  const [producoesTab, setProducoesTab] = useState("all");
  const ITENS_POR_PAG = 10;
  const [prodPagina, setProdPagina] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProducaoDetalhe | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    setDetail(null);
    api.producoes.obter(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  useEffect(() => {
    Promise.allSettled([
      api.pesquisadores.obter(lattes_id),
      api.pesquisadores.formacao(lattes_id),
      api.pesquisadores.areas(lattes_id),
      api.pesquisadores.producoes(lattes_id, { limit: "200" }),
    ]).then(([p, f, a, pr]) => {
      if (p.status === "fulfilled") setPesquisador(p.value);
      if (f.status === "fulfilled") setFormacao(f.value);
      if (a.status === "fulfilled") setAreas(a.value);
      if (pr.status === "fulfilled") setProducoes(pr.value);
    }).finally(() => setLoading(false));
  }, [lattes_id]);

  if (loading) return <p className="text-center text-zinc-400 py-20">Carregando...</p>;
  if (!pesquisador) return <p className="text-center text-zinc-400 py-20">Pesquisador não encontrado.</p>;

  // Producoes por ano
  const anoMap = new Map<number, number>();
  producoes.forEach((p) => {
    if (p.ano_publicacao) anoMap.set(p.ano_publicacao, (anoMap.get(p.ano_publicacao) ?? 0) + 1);
  });
  const producoesPorAno = Array.from(anoMap.entries())
    .map(([ano, count]) => ({ ano, count }))
    .sort((a, b) => a.ano - b.ano);

  // Producoes por tipo
  const tipoMap = new Map<string, number>();
  producoes.forEach((p) => {
    const t = p.tipo_producao || "outro";
    tipoMap.set(t, (tipoMap.get(t) ?? 0) + 1);
  });
  const producoesPorTipo = Array.from(tipoMap.entries())
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count);

  const TAB_DEFS = [
    { key: "all", label: "Todos", tipos: null as string[] | null },
    { key: "article", label: "Artigos", tipos: ["article"] },
    { key: "book", label: "Livros", tipos: ["book"] },
    { key: "book-chapter", label: "Capítulos", tipos: ["book-chapter"] },
    { key: "patent", label: "Marcas/Patentes", tipos: ["patent"] },
    { key: "other", label: "Outros", tipos: [] },
  ];

  const tiposConhecidos = new Set(TAB_DEFS.flatMap((t) => t.tipos ?? []));
  const producoesFiltradas =
    producoesTab === "all"
      ? producoes
      : producoesTab === "other"
        ? producoes.filter((p) => !tiposConhecidos.has(p.tipo_producao ?? ""))
        : producoes.filter((p) => TAB_DEFS.find((t) => t.key === producoesTab)?.tipos?.includes(p.tipo_producao ?? ""));

  const TYPE_COLORS: Record<string, string> = {
    article: "#3b82f6",
    book: "#10b981",
    "book-chapter": "#f59e0b",
    patent: "#ef4444",
  };
  const TYPE_LABELS: Record<string, string> = {
    article: "Artigo",
    book: "Livro",
    "book-chapter": "Capítulo",
    patent: "Patente",
  };

  const anosUnicos = [...new Set(producoesFiltradas.map((p) => p.ano_publicacao).filter(Boolean) as number[])].sort((a, b) => a - b);
  const tiposPresentes = [...new Set(producoesFiltradas.map((p) => p.tipo_producao ?? "outro").filter(Boolean))];

  const producoesPorAnoStacked = anosUnicos.map((ano) => {
    const entry: Record<string, number | string> = { ano };
    tiposPresentes.forEach((tipo) => {
      entry[tipo] = producoesFiltradas.filter((p) => p.ano_publicacao === ano && (p.tipo_producao ?? "outro") === tipo).length;
    });
    return entry;
  });

  const statCards = [
    { label: "Produções", value: pesquisador.qtd_producoes ?? producoes.length, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
    { label: "Citações", value: pesquisador.qtd_citacoes_pesquisador ?? 0, icon: Quote, color: "text-emerald-600 bg-emerald-50" },
    { label: "H-index", value: pesquisador.indice_h ?? 0, icon: Hash, color: "text-violet-600 bg-violet-50" },
    { label: "I-10", value: pesquisador.indice_i10 ?? 0, icon: Award, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/pesquisadores" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Voltar para pesquisadores
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-5">
          {pesquisador.id_photo_lattes && (
            <img
              src={`http://servicosweb.cnpq.br/wspessoa/servletrecuperafoto?tipo=1&id=${pesquisador.id_photo_lattes}`}
              alt={`Foto de ${pesquisador.nome_completo}`}
              className="h-20 w-20 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <h1 className="text-2xl font-bold">{pesquisador.nome_completo}</h1>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pesquisador.instituicao_empresa && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Building2 className="h-4 w-4 shrink-0" /> {pesquisador.instituicao_empresa}
            </div>
          )}
          {pesquisador.nacionalidade && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Globe className="h-4 w-4 shrink-0" /> {pesquisador.nacionalidade}
            </div>
          )}
          {pesquisador.orcid_id && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <a href={`https://orcid.org/${pesquisador.orcid_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {pesquisador.orcid_id}
              </a>
            </div>
          )}
          {pesquisador.data_atualizacao_lattes && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Calendar className="h-4 w-4 shrink-0" /> Atualizado em {pesquisador.data_atualizacao_lattes}
            </div>
          )}
        </div>
        {pesquisador.resumo_cv && (
          <div className="mt-4">
            <p className={`text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${!resumoExpandido ? "line-clamp-4" : ""}`}>
              {pesquisador.resumo_cv}
            </p>
            <button
              onClick={() => setResumoExpandido(!resumoExpandido)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {resumoExpandido ? (
                <>Mostrar menos <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Expandir <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts + Formacao */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Producoes por Tipo */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Publicações por Tipo</h2>
          {producoesPorTipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={producoesPorTipo}
                  dataKey="count"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {producoesPorTipo.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.tipo] ?? COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400">Nenhum dado disponível.</p>
          )}
        </div>

        {/* Formacao */}
        {formacao.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Formação Acadêmica</h2>
            </div>
            <div className="space-y-4">
            {formacao.map((f, i) => (
              <div key={i} className="border-l-2 border-blue-200 pl-4 dark:border-blue-800">
                <p className="text-sm font-medium">{f.tipo_formacao}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.nome_curso}</p>
                <p className="text-xs text-zinc-400">
                  {f.nome_instituicao}
                  {f.ano_conclusao && ` · ${f.ano_conclusao}`}
                  {f.nome_orientador && ` · Orientador: ${f.nome_orientador}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Areas */}
      {areas.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Áreas de Atuação</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <span
                key={i}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {a.nome_area}
                {a.nome_sub_area && ` / ${a.nome_sub_area}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Producoes com abas */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Produções ({producoes.length})
          </h2>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-700">
          {TAB_DEFS.map((tab) => {
            const count =
              tab.key === "all"
                ? producoes.length
                : tab.key === "other"
                  ? producoes.filter((p) => !tiposConhecidos.has(p.tipo_producao ?? "")).length
                  : producoes.filter((p) => tab.tipos?.includes(p.tipo_producao ?? "")).length;
            if (count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => { setProducoesTab(tab.key); setProdPagina(0); }}
                className={`rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  producoesTab === tab.key
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Chart por ano filtrado */}
        <div className="mb-6">
          {producoesPorAnoStacked.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={producoesPorAnoStacked}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="ano" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {tiposPresentes.map((tipo) => (
                  <Bar
                    key={tipo}
                    dataKey={tipo}
                    stackId="a"
                    fill={TYPE_COLORS[tipo] ?? "#a1a1aa"}
                    radius={[0, 0, 0, 0]}
                    name={TYPE_LABELS[tipo] ?? tipo}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400 py-8 text-center">Nenhum dado disponível para esta categoria.</p>
          )}
        </div>

        {/* Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {producoesFiltradas.slice(prodPagina * ITENS_POR_PAG, (prodPagina + 1) * ITENS_POR_PAG).map((p) => (
            <button
              key={p.openalex_id}
              onClick={() => setSelectedId(p.openalex_id)}
              className="group flex flex-col rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-blue-200 hover:shadow-sm dark:border-zinc-700 dark:hover:border-blue-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-3">
                  {p.titulo ?? "Sem título"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.tipo_producao && (
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {p.tipo_producao}
                    </span>
                  )}
                  {p.ano_publicacao && (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {p.ano_publicacao}
                    </span>
                  )}
                  {p.pesquisador && (
                    <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {p.pesquisador}
                    </span>
                  )}
                </div>
                {p.journal_name && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-1">{p.journal_name}</p>
                )}
              </div>
              {p.qtd_citacoes_producao !== null && p.qtd_citacoes_producao !== undefined && (
                <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
                  <Quote className="h-3 w-3" />
                  {p.qtd_citacoes_producao} citação(ões)
                </div>
              )}
            </button>
          ))}
        </div>
        {producoesFiltradas.length > ITENS_POR_PAG && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setProdPagina((p) => Math.max(0, p - 1))}
              disabled={prodPagina === 0}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-sm text-zinc-500">
              {prodPagina + 1} de {Math.ceil(producoesFiltradas.length / ITENS_POR_PAG)}
            </span>
            <button
              onClick={() => setProdPagina((p) => p + 1)}
              disabled={(prodPagina + 1) * ITENS_POR_PAG >= producoesFiltradas.length}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedId(null)} />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <button
              onClick={() => setSelectedId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <h2 className="text-lg font-bold leading-relaxed pr-8">
                  {detail.titulo ?? "Sem título"}
                </h2>

                <div className="flex flex-wrap gap-2">
                  {detail.pesquisador && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {detail.pesquisador}
                    </span>
                  )}
                  {detail.ano_publicacao && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {detail.ano_publicacao}
                    </span>
                  )}
                  {detail.tipo_producao && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {detail.tipo_producao}
                    </span>
                  )}
                  {detail.idioma && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {detail.idioma}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs text-zinc-400">Citações</p>
                    <p className="text-lg font-bold">{detail.qtd_citacoes_producao ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs text-zinc-400">Referências</p>
                    <p className="text-lg font-bold">{detail.qtd_referencias_producao ?? 0}</p>
                  </div>
                  {detail.journal_name && (
                    <div className="col-span-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                      <p className="text-xs text-zinc-400">Periódico</p>
                      <p className="text-sm font-medium">{detail.journal_name}</p>
                    </div>
                  )}
                </div>

                {detail.abstract && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Resumo</h3>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-6">
                      {detail.abstract}
                    </p>
                  </div>
                )}

                {detail.palavras_chave && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Palavras-chave</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{detail.palavras_chave}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <a
                    href={`https://openalex.org/${detail.openalex_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no OpenAlex
                  </a>
                  {detail.doi && (
                    <a
                      href={`https://doi.org/${detail.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <FileText className="h-4 w-4" />
                      DOI
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-zinc-400 py-16">Não foi possível carregar os detalhes.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
