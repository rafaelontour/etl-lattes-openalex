from typing import Optional
from core.database import get_pool
from models.producao import ProducaoResumo, ProducaoDetalhe, ProducaoAutor


async def listar_producoes(
    ano_min: Optional[int] = None,
    ano_max: Optional[int] = None,
    tipo: Optional[str] = None,
    idioma: Optional[str] = None,
    journal: Optional[str] = None,
<<<<<<< HEAD
=======
    titulo: Optional[str] = None,
>>>>>>> cf92a72 (atualizando)
    page: int = 1,
    limit: int = 20,
) -> list[ProducaoResumo]:
    pool = await get_pool()
    conditions = []
    params = []
    idx = 1

    if ano_min:
        conditions.append(f"ano_publicacao >= ${idx}")
        params.append(ano_min)
        idx += 1
    if ano_max:
        conditions.append(f"ano_publicacao <= ${idx}")
        params.append(ano_max)
        idx += 1
    if tipo:
        conditions.append(f"LOWER(tipo_producao) = LOWER(${idx})")
        params.append(tipo)
        idx += 1
    if idioma:
        conditions.append(f"LOWER(idioma) = LOWER(${idx})")
        params.append(idioma)
        idx += 1
    if journal:
        conditions.append(f"LOWER(journal_name) LIKE LOWER(${idx})")
        params.append(f"%{journal}%")
        idx += 1
<<<<<<< HEAD
=======
    if titulo:
        conditions.append(f"LOWER(titulo) LIKE LOWER(${idx})")
        params.append(f"%{titulo}%")
        idx += 1
>>>>>>> cf92a72 (atualizando)

    where = " AND ".join(conditions) if conditions else "TRUE"
    offset = (page - 1) * limit

    query = f"""
<<<<<<< HEAD
        SELECT openalex_id, titulo, ano_publicacao, tipo_producao,
               qtd_citacoes_producao, journal_name, idioma
        FROM relacional.producao
        WHERE {where}
        ORDER BY ano_publicacao DESC NULLS LAST
=======
        SELECT p.openalex_id, p.titulo, p.ano_publicacao, p.tipo_producao,
               p.qtd_citacoes_producao, p.journal_name, p.idioma,
               (SELECT pe.nome_completo
                FROM relacional.autoria a
                JOIN relacional.pesquisador pe ON pe.lattes_id = a.lattes_id
                WHERE a.openalex_producao_id = p.openalex_id
                ORDER BY a.ordem_autoria
                LIMIT 1) AS pesquisador
        FROM relacional.producao p
        WHERE {where}
        ORDER BY p.ano_publicacao DESC NULLS LAST
>>>>>>> cf92a72 (atualizando)
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    params.append(limit)
    params.append(offset)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return [ProducaoResumo(**dict(r)) for r in rows]


async def obter_producao(openalex_id: str) -> Optional[ProducaoDetalhe]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
<<<<<<< HEAD
            """SELECT * FROM relacional.producao WHERE openalex_id = $1""",
=======
            """SELECT p.*,
                      (SELECT pe.nome_completo
                       FROM relacional.autoria a
                       JOIN relacional.pesquisador pe ON pe.lattes_id = a.lattes_id
                       WHERE a.openalex_producao_id = p.openalex_id
                       ORDER BY a.ordem_autoria
                       LIMIT 1) AS pesquisador
               FROM relacional.producao p WHERE p.openalex_id = $1""",
>>>>>>> cf92a72 (atualizando)
            openalex_id,
        )
    return ProducaoDetalhe(**dict(row)) if row else None


async def listar_autores(openalex_id: str) -> list[ProducaoAutor]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT a.nome_autor, a.ordem_autoria, a.autor_principal,
                      a.correspondente, a.afiliacao_autor
               FROM relacional.autoria a
<<<<<<< HEAD
               WHERE a.openalex_id = $1
=======
               WHERE a.openalex_producao_id = $1
>>>>>>> cf92a72 (atualizando)
               ORDER BY a.ordem_autoria""",
            openalex_id,
        )
    return [ProducaoAutor(**dict(r)) for r in rows]


async def listar_producoes_pesquisador(
    lattes_id: str,
    ano: Optional[int] = None,
    tipo: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> list[ProducaoResumo]:
    pool = await get_pool()
    conditions = ["a.lattes_id = $1"]
    params = [lattes_id]
    idx = 2

    if ano:
        conditions.append(f"p.ano_publicacao = ${idx}")
        params.append(ano)
        idx += 1
    if tipo:
        conditions.append(f"LOWER(p.tipo_producao) = LOWER(${idx})")
        params.append(tipo)
        idx += 1

    where = " AND ".join(conditions)
    offset = (page - 1) * limit

    query = f"""
        SELECT p.openalex_id, p.titulo, p.ano_publicacao, p.tipo_producao,
<<<<<<< HEAD
               p.qtd_citacoes_producao, p.journal_name, p.idioma
        FROM relacional.producao p
        JOIN relacional.autoria a ON a.openalex_id = p.openalex_id
=======
               p.qtd_citacoes_producao, p.journal_name, p.idioma,
               (SELECT pe.nome_completo
                FROM relacional.autoria a2
                JOIN relacional.pesquisador pe ON pe.lattes_id = a2.lattes_id
                WHERE a2.openalex_producao_id = p.openalex_id
                ORDER BY a2.ordem_autoria
                LIMIT 1) AS pesquisador
        FROM relacional.producao p
        JOIN relacional.autoria a ON a.openalex_producao_id = p.openalex_id
>>>>>>> cf92a72 (atualizando)
        WHERE {where}
        ORDER BY p.ano_publicacao DESC NULLS LAST
        LIMIT ${idx} OFFSET ${idx + 1}
    """
    params.append(limit)
    params.append(offset)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return [ProducaoResumo(**dict(r)) for r in rows]


async def listar_tipos() -> list[str]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT DISTINCT tipo_producao FROM relacional.producao
               WHERE tipo_producao IS NOT NULL ORDER BY tipo_producao"""
        )
    return [r["tipo_producao"] for r in rows]


async def listar_anos() -> list[int]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT DISTINCT ano_publicacao FROM relacional.producao
               WHERE ano_publicacao IS NOT NULL ORDER BY ano_publicacao DESC"""
        )
    return [r["ano_publicacao"] for r in rows]
