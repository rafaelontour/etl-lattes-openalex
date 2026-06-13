import json
from typing import Optional
from backend.core.database import get_pool
from backend.models.busca import ResultadoBusca, Sugestao

self_query_service = None
try:
    from backend.scripts.gold.self_query_retriever import SelfQueryGold
    _sq = SelfQueryGold()
    _ok = _sq.setup()
    if _ok:
        self_query_service = _sq
except Exception:
    pass


async def buscar_vetorial(
    embedding: list[float],
    filtros: Optional[dict] = None,
    limite: int = 20,
) -> list[ResultadoBusca]:
    pool = await get_pool()
    params = [json.dumps(embedding)]
    idx = 2

    filter_clauses = []
    if filtros:
        if filtros.get("ano_min"):
            filter_clauses.append(f"p.ano_publicacao >= ${idx}")
            params.append(filtros["ano_min"])
            idx += 1
        if filtros.get("ano_max"):
            filter_clauses.append(f"p.ano_publicacao <= ${idx}")
            params.append(filtros["ano_max"])
            idx += 1
        if filtros.get("tipo"):
            filter_clauses.append(f"LOWER(p.tipo_producao) = LOWER(${idx})")
            params.append(filtros["tipo"])
            idx += 1

    filter_sql = " AND ".join(filter_clauses) if filter_clauses else "TRUE"

    query = f"""
        SELECT * FROM (
            SELECT
                p.openalex_id,
                p.titulo,
                p.abstract,
                p.ano_publicacao,
                p.tipo_producao,
                p.journal_name,
                p.doi,
                NULL::bool AS eh_acesso_aberto,
                GREATEST(
                    COALESCE(1 - (p.titulo_embedding <=> $1::vector), 0),
                    COALESCE(1 - (p.abstract_embedding <=> $1::vector), 0)
                ) AS score,
                pe.nome_completo AS pesquisador,
                NULL::text AS lattes_id,
                'producao' AS tipo_resultado
            FROM relacional.producao p
            LEFT JOIN relacional.autoria a ON a.openalex_producao_id = p.openalex_id AND a.autor_principal = TRUE
            LEFT JOIN relacional.pesquisador pe ON pe.lattes_id = a.lattes_id
            WHERE {filter_sql}

            UNION ALL

            SELECT
                NULL::text AS openalex_id,
                pe.nome_completo AS titulo,
                pe.resumo_cv AS abstract,
                NULL::int AS ano_publicacao,
                NULL::text AS tipo_producao,
                NULL::text AS journal_name,
                NULL::text AS doi,
                NULL::bool AS eh_acesso_aberto,
                COALESCE(1 - (pe.resumo_embedding <=> $1::vector), 0) AS score,
                pe.nome_completo AS pesquisador,
                pe.lattes_id,
                'pesquisador' AS tipo_resultado
            FROM relacional.pesquisador pe
            WHERE pe.resumo_embedding IS NOT NULL
        ) AS combined
        ORDER BY score DESC
        LIMIT ${idx}
    """
    params.append(limite)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    return [
        ResultadoBusca(
            openalex_id=r["openalex_id"],
            titulo=r["titulo"],
            abstract=r["abstract"],
            ano_publicacao=r["ano_publicacao"],
            tipo_producao=r["tipo_producao"],
            journal_name=r["journal_name"],
            score=float(r["score"]) if r["score"] is not None else None,
            pesquisador=r["pesquisador"],
            lattes_id=r["lattes_id"],
            tipo_resultado=r["tipo_resultado"],
            doi=r["doi"],
            eh_acesso_aberto=r["eh_acesso_aberto"],
        )
        for r in rows
    ]


async def sugerir(
    prefixo: str,
    tipo: str = "pesquisador",
    limite: int = 10,
) -> list[Sugestao]:
    pool = await get_pool()

    if tipo == "pesquisador":
        query = """
            SELECT nome_completo AS texto, 'pesquisador' AS tipo
            FROM relacional.pesquisador
            WHERE nome_completo ILIKE $1 || '%'
            ORDER BY nome_completo
            LIMIT $2
        """
    elif tipo == "producao":
        query = """
            SELECT titulo AS texto, 'producao' AS tipo
            FROM relacional.producao
            WHERE titulo IS NOT NULL AND titulo ILIKE $1 || '%'
            ORDER BY titulo
            LIMIT $2
        """
    elif tipo == "area":
        query = """
            SELECT DISTINCT nome_area AS texto, 'area' AS tipo
            FROM relacional.area_atuacao
            WHERE nome_area ILIKE $1 || '%'
            ORDER BY texto
            LIMIT $2
        """
    else:
        return []

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, prefixo, limite)

    return [Sugestao(texto=r["texto"], tipo=r["tipo"]) for r in rows]
