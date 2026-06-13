"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ProducaoDetalhe } from "@/lib/api";
import { ArrowLeft, ExternalLink, BookOpen, Quote, Hash, FileText, Globe } from "lucide-react";

export default function ProducaoDetalhePage() {
  const { openalex_id } = useParams<{ openalex_id: string }>();
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.producoes.obter(openalex_id)
      .then(setProducao)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [openalex_id]);

  if (loading) return <p className="text-center text-zinc-400 py-20">Carregando...</p>;
  if (!producao) return <p className="text-center text-zinc-400 py-20">Produção não encontrada.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/producoes" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" /> Voltar para produções
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold leading-relaxed">{producao.titulo ?? "Sem título"}</h1>

        <div className="mt-6 flex flex-wrap gap-3">
          {producao.ano_publicacao && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {producao.ano_publicacao}
            </span>
          )}
          {producao.tipo_producao && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {producao.tipo_producao}
            </span>
          )}
          {producao.idioma && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {producao.idioma}
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-xs text-zinc-400">Citações</p>
            <p className="text-lg font-bold">{producao.qtd_citacoes_producao ?? 0}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-xs text-zinc-400">Referências</p>
            <p className="text-lg font-bold">{producao.qtd_referencias_producao ?? 0}</p>
          </div>
          {producao.journal_name && (
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800 col-span-2">
              <p className="text-xs text-zinc-400">Periódico</p>
              <p className="text-sm font-medium truncate">{producao.journal_name}</p>
            </div>
          )}
        </div>

        {producao.doi && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4 text-zinc-400" />
            <a
              href={`https://doi.org/${producao.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              {producao.doi}
            </a>
          </div>
        )}

        {producao.issn && (
          <p className="mt-1 text-sm text-zinc-500">ISSN: {producao.issn}</p>
        )}

        {producao.abstract && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Resumo</h2>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{producao.abstract}</p>
          </div>
        )}

        {producao.palavras_chave && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Palavras-chave</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{producao.palavras_chave}</p>
          </div>
        )}
      </div>
    </div>
  );
}
