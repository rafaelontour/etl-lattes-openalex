import sys
import os
import polars as pl
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from dotenv import load_dotenv

_SCRIPT_DIR = str(Path(__file__).resolve().parent)
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from embedding_utils import add_embedding_column
from create_dim_tempo import generate_dim_tempo

load_dotenv()

_THIS_DIR = Path(__file__).resolve().parent
_SCRIPTS_DIR = str(_THIS_DIR.parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scripts.utils import get_latest_date

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "lattes_gold"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
}
SCHEMA = os.getenv("POSTGRES_SCHEMA_RELATIONAL", "relacional")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_STORAGE = BASE_DIR / "data-storage"


def _resolve_silver_date(silver_date: str | None = None) -> str:
    if silver_date:
        return silver_date
    d = get_latest_date("02-silver", "lattes", "pesquisadores")
    return d if d else "24052026"


def get_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    return conn


def ensure_schema(conn):
    with conn.cursor() as cur:
        cur.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")


def create_tables(conn):
    statements = [
        f"DROP TABLE IF EXISTS {SCHEMA}.producao CASCADE",
        f"DROP TABLE IF EXISTS {SCHEMA}.autoria CASCADE",
        f"DROP TABLE IF EXISTS {SCHEMA}.pesquisador CASCADE",
        f"DROP TABLE IF EXISTS {SCHEMA}.formacao CASCADE",
        f"DROP TABLE IF EXISTS {SCHEMA}.area_atuacao CASCADE",
        f"""
        CREATE TABLE {SCHEMA}.pesquisador (
            lattes_id TEXT PRIMARY KEY,
            orcid_id TEXT,
            nome_completo TEXT NOT NULL,
            resumo_cv TEXT,
            resumo_embedding vector(384),
            indice_h INTEGER,
            indice_i10 INTEGER,
            qtd_producoes INTEGER,
            qtd_citacoes_pesquisador INTEGER,
            nacionalidade TEXT,
            instituicao_empresa TEXT,
            nome_orgao TEXT,
            data_atualizacao_lattes TEXT,
            updated_at TIMESTAMP
        )
        """,
        f"""
        CREATE TABLE {SCHEMA}.producao (
            openalex_id TEXT PRIMARY KEY,
            doi TEXT,
            titulo TEXT,
            titulo_embedding vector(384),
            abstract TEXT,
            abstract_embedding vector(384),
            ano_publicacao INTEGER,
            tipo_producao TEXT,
            idioma TEXT,
            qtd_citacoes_producao INTEGER,
            qtd_referencias_producao INTEGER,
            journal_name TEXT,
            issn TEXT,
            palavras_chave TEXT,
            created_at TEXT,
            updated_at TIMESTAMP
        )
        """,
        f"""
        CREATE TABLE {SCHEMA}.autoria (
            openalex_producao_id TEXT NOT NULL,
            lattes_id TEXT NOT NULL,
            ordem_autoria INTEGER,
            autor_principal BOOLEAN,
            correspondente BOOLEAN,
            afiliacao_autor TEXT,
            PRIMARY KEY (openalex_producao_id, lattes_id)
        )
        """,
        f"""
        CREATE TABLE {SCHEMA}.formacao (
            id SERIAL PRIMARY KEY,
            lattes_id TEXT,
            tipo_formacao TEXT,
            nome_curso TEXT,
            nome_instituicao TEXT,
            ano_inicio INTEGER,
            ano_conclusao INTEGER,
            nome_orientador TEXT,
            nome_agencia TEXT
        )
        """,
        f"""
        CREATE TABLE {SCHEMA}.area_atuacao (
            id SERIAL PRIMARY KEY,
            lattes_id TEXT,
            sequencia TEXT,
            nome_grande_area TEXT,
            nome_area TEXT,
            nome_sub_area TEXT,
            nome_especialidade TEXT
        )
        """,
    ]
    with conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)


def read_silver(entity: str, source: str = "open-alex", date: str | None = None) -> pl.DataFrame:
    date = date or _resolve_silver_date()
    path = DATA_STORAGE / "02-silver" / source / date / entity
    files = list(path.glob(f"{entity}_*.parquet"))
    if not files:
        print(f"  [AVISO] Nenhum parquet encontrado para {entity}")
        return pl.DataFrame()
    df = pl.read_parquet(files[0])
    print(f"  Lidas {df.height} linhas de {entity} ({source})")
    return df


def load_pesquisador(conn):
    print("\n[RELACIONAL] Carregando pesquisadores...")
    df_pes = read_silver("pesquisadores", "lattes")
    if df_pes.is_empty():
        return

    df_pes = add_embedding_column(df_pes, "resumo_cv", "resumo_embedding")

    cols = [
        "lattes_id", "orcid_id", "nome_completo", "resumo_cv", "resumo_embedding",
        "indice_h", "indice_i10", "qtd_producoes", "qtd_citacoes_pesquisador",
        "nacionalidade", "instituicao_empresa", "nome_orgao", "data_atualizacao_lattes",
        "updated_at",
    ]
    cols_present = [c for c in cols if c in df_pes.columns]
    records = [tuple(r[c] for c in cols_present) for r in df_pes.select(cols_present).to_dicts()]
    placeholders = ",".join(f"%s" for _ in cols_present)
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.pesquisador CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.pesquisador ({cols_list}) VALUES %s ON CONFLICT (lattes_id) DO NOTHING",
            records,
        )
    print(f"  Inseridos {len(records)} pesquisadores")


def load_producao(conn):
    print("\n[RELACIONAL] Carregando producoes...")
    df_wrk = read_silver("works", "open-alex")
    if df_wrk.is_empty():
        return

    df_wrk = df_wrk.with_columns(
        pl.col("openalex_id").map_elements(
            lambda url: url.split("/")[-1] if url and "/" in url else url,
            return_dtype=pl.String,
        ).alias("openalex_id")
    )

    df_wrk = add_embedding_column(df_wrk, "titulo", "titulo_embedding")
    df_wrk = add_embedding_column(df_wrk, "abstract", "abstract_embedding")

    df_wrk = df_wrk.with_columns(
        pl.col("palavras_chave").list.join(",").alias("palavras_chave")
    )

    cols = [
        "openalex_id", "doi", "titulo", "titulo_embedding", "abstract", "abstract_embedding",
        "ano_publicacao", "tipo_producao", "idioma", "qtd_citacoes_producao",
        "qtd_referencias_producao", "journal_name", "issn", "palavras_chave",
        "created_at", "updated_at",
    ]
    cols_present = [c for c in cols if c in df_wrk.columns]
    records = [tuple(r[c] for c in cols_present) for r in df_wrk.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.producao CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.producao ({cols_list}) VALUES %s ON CONFLICT (openalex_id) DO NOTHING",
            records,
        )
    print(f"  Inseridos {len(records)} producoes")


def load_autoria(conn):
    print("\n[RELACIONAL] Carregando autorias...")
    df_aut = read_silver("autores_producao", "open-alex")
    df_pes = read_silver("pesquisadores", "lattes")
    if df_aut.is_empty() or df_pes.is_empty():
        return

    def extract_openalex_id(url: str) -> str:
        return url.split("/")[-1] if url and "/" in url else url

    df_aut = df_aut.with_columns(
        pl.col("openalex_autor_id")
        .map_elements(extract_openalex_id, return_dtype=pl.String)
        .alias("openalex_autor_id_short")
    ).with_columns(
        pl.col("openalex_producao_id")
        .map_elements(extract_openalex_id, return_dtype=pl.String)
        .alias("openalex_producao_id")
    )

    df_aut = df_aut.join(
        df_pes.select(["lattes_id", "openalex_id"]),
        left_on="openalex_autor_id_short",
        right_on="openalex_id",
        how="inner",
    )

    cols = ["openalex_producao_id", "lattes_id", "ordem_autoria", "autor_principal",
            "correspondente", "afiliacao_autor"]
    cols_present = [c for c in cols if c in df_aut.columns]
    records = [tuple(r[c] for c in cols_present) for r in df_aut.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.autoria CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.autoria ({cols_list}) VALUES %s ON CONFLICT DO NOTHING",
            records,
        )
    print(f"  Inseridos {len(records)} autorias")


def load_formacao(conn):
    print("\n[RELACIONAL] Carregando formacoes...")
    df = read_silver("formacoes", "lattes")
    if df.is_empty():
        return

    cols = ["lattes_id", "tipo_formacao", "nome_curso", "nome_instituicao",
            "ano_inicio", "ano_conclusao", "nome_orientador", "nome_agencia"]
    cols_present = [c for c in cols if c in df.columns]
    records = [tuple(r[c] for c in cols_present) for r in df.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.formacao CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.formacao ({cols_list}) VALUES %s",
            records,
        )
    print(f"  Inseridos {len(records)} registros de formacao")


def load_area_atuacao(conn):
    print("\n[RELACIONAL] Carregando areas de atuacao...")
    df = read_silver("areas_atuacao", "lattes")
    if df.is_empty():
        return

    cols = ["lattes_id", "sequencia", "nome_grande_area", "nome_area",
            "nome_sub_area", "nome_especialidade"]
    cols_present = [c for c in cols if c in df.columns]
    records = [tuple(r[c] for c in cols_present) for r in df.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.area_atuacao CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.area_atuacao ({cols_list}) VALUES %s",
            records,
        )
    print(f"  Inseridos {len(records)} registros de area_atuacao")


def execute(silver_date: str | None = None, gold_date: str | None = None):
    print("=" * 60)
    print("CAMADA GOLD - BANCO RELACIONAL (PostgreSQL + pgvector)")
    print("=" * 60)

    _date = _resolve_silver_date(silver_date)
    globals()["SILVER_DATE"] = _date  # make it available for read_silver

    try:
        conn = get_conn()
    except Exception as e:
        print(f"[ERRO] Nao foi possivel conectar ao PostgreSQL: {e}")
        print("[RELACIONAL] Carga ignorada. Verifique se o banco esta rodando.")
        return

    try:
        ensure_schema(conn)
        create_tables(conn)
        load_pesquisador(conn)
        load_producao(conn)
        load_autoria(conn)
        load_formacao(conn)
        load_area_atuacao(conn)
        print("\n[RELACIONAL] Carga concluida com sucesso!")
    finally:
        conn.close()


if __name__ == "__main__":
    import sys
    silver = sys.argv[1] if len(sys.argv) > 1 else None
    gold = sys.argv[2] if len(sys.argv) > 2 else None
    execute(silver_date=silver, gold_date=gold)
