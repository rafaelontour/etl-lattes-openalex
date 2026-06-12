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
SCHEMA = os.getenv("POSTGRES_SCHEMA_STAR", "star_schema")

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


def create_tables(conn):
    statements = [
        f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.dim_pesquisador (
            id_pesquisador SERIAL PRIMARY KEY,
            lattes_id TEXT,
            orcid_id TEXT,
            nome_completo TEXT,
            resumo_cv TEXT,
            indice_h INTEGER,
            indice_i10 INTEGER,
            qtd_producoes INTEGER,
            qtd_citacoes_pesquisador INTEGER,
            nacionalidade TEXT,
            instituicao_empresa TEXT,
            nome_orgao TEXT
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.dim_producao (
            id_producao SERIAL PRIMARY KEY,
            openalex_id TEXT,
            doi TEXT,
            titulo TEXT,
            ano_publicacao INTEGER,
            tipo_producao TEXT,
            idioma TEXT,
            journal_name TEXT,
            issn TEXT
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.dim_tempo (
            id_tempo INTEGER PRIMARY KEY,
            ano INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            trimestre INTEGER NOT NULL,
            data_completa TEXT
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.dim_tipo_producao (
            id_tipo_producao SERIAL PRIMARY KEY,
            tipo_producao TEXT UNIQUE NOT NULL
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.dim_journal (
            id_journal SERIAL PRIMARY KEY,
            journal_name TEXT UNIQUE NOT NULL,
            issn TEXT
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {SCHEMA}.fato_producao (
            id_producao INTEGER NOT NULL REFERENCES {SCHEMA}.dim_producao(id_producao),
            id_pesquisador INTEGER NOT NULL REFERENCES {SCHEMA}.dim_pesquisador(id_pesquisador),
            id_tempo INTEGER REFERENCES {SCHEMA}.dim_tempo(id_tempo),
            id_tipo_producao INTEGER REFERENCES {SCHEMA}.dim_tipo_producao(id_tipo_producao),
            id_journal INTEGER REFERENCES {SCHEMA}.dim_journal(id_journal),
            qtd_citacoes_producao INTEGER,
            qtd_referencias_producao INTEGER,
            ordem_autoria INTEGER,
            autor_principal BOOLEAN,
            correspondente BOOLEAN,
            PRIMARY KEY (id_producao, id_pesquisador)
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
        return pl.DataFrame()
    df = pl.read_parquet(files[0])
    print(f"  Lidas {df.height} linhas de {entity} ({source})")
    return df


def load_dim_tempo(conn):
    print("\n[STAR] Carregando dim_tempo...")
    df = generate_dim_tempo(2000, 2030)
    records = [tuple(r[c] for c in ["id_tempo", "ano", "mes", "trimestre", "data_completa"])
               for r in df.to_dicts()]

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_tempo CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.dim_tempo (id_tempo, ano, mes, trimestre, data_completa) VALUES %s ON CONFLICT DO NOTHING",
            records,
        )
    print(f"  Inseridos {len(records)} registros em dim_tempo")


def load_dim_pesquisador(conn):
    print("\n[STAR] Carregando dim_pesquisador...")
    df = read_silver("pesquisadores", "lattes")
    if df.is_empty():
        return pl.DataFrame()

    cols = ["lattes_id", "orcid_id", "nome_completo", "resumo_cv",
            "indice_h", "indice_i10", "qtd_producoes", "qtd_citacoes_pesquisador",
            "nacionalidade", "instituicao_empresa", "nome_orgao"]
    cols_present = [c for c in cols if c in df.columns]
    records = [tuple(r[c] for c in cols_present) for r in df.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_pesquisador CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.dim_pesquisador ({cols_list}) VALUES %s",
            records,
        )
    print(f"  Inseridos {len(records)} pesquisadores")
    return df


def load_dim_producao(conn):
    print("\n[STAR] Carregando dim_producao...")
    df = read_silver("works", "open-alex")
    if df.is_empty():
        return pl.DataFrame()

    cols = ["openalex_id", "doi", "titulo", "ano_publicacao", "tipo_producao",
            "idioma", "journal_name", "issn"]
    cols_present = [c for c in cols if c in df.columns]
    records = [tuple(r[c] for c in cols_present) for r in df.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_producao CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.dim_producao ({cols_list}) VALUES %s",
            records,
        )
    print(f"  Inseridos {len(records)} producoes")
    return df


def load_dim_tipo_producao(conn, df_works: pl.DataFrame):
    print("\n[STAR] Carregando dim_tipo_producao...")
    if df_works.is_empty():
        return

    tipos = df_works.select("tipo_producao").unique().drop_nulls()
    records = [(r["tipo_producao"],) for r in tipos.to_dicts()]

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_tipo_producao CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.dim_tipo_producao (tipo_producao) VALUES %s ON CONFLICT DO NOTHING",
            records,
        )
    print(f"  Inseridos {len(records)} tipos de producao")


def load_dim_journal(conn, df_works: pl.DataFrame):
    print("\n[STAR] Carregando dim_journal...")
    if df_works.is_empty():
        return

    journals = df_works.select(["journal_name", "issn"]).unique().drop_nulls(subset=["journal_name"])
    records = [(r["journal_name"], r["issn"]) for r in journals.to_dicts()]

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_journal CASCADE")
        execute_values(
            cur,
            f"INSERT INTO {SCHEMA}.dim_journal (journal_name, issn) VALUES %s ON CONFLICT DO NOTHING",
            records,
        )
    print(f"  Inseridos {len(records)} journals")


def load_fato_producao(conn):
    print("\n[STAR] Carregando fato_producao...")
    df_aut = read_silver("autores_producao", "open-alex")
    df_pes = read_silver("pesquisadores", "lattes")
    df_wrk = read_silver("works", "open-alex")

    if any(d.is_empty() for d in [df_aut, df_pes, df_wrk]):
        print("  Dados insuficientes para fato_producao")
        return

    def extract_openalex_id(url: str) -> str:
        return url.split("/")[-1] if url and "/" in url else url

    df_aut = df_aut.with_columns(
        pl.col("openalex_autor_id")
        .map_elements(extract_openalex_id, return_dtype=pl.String)
        .alias("openalex_autor_id_short")
    )

    df_fato = (
        df_aut.join(
            df_pes.select(["lattes_id", "openalex_id"]),
            left_on="openalex_autor_id_short",
            right_on="openalex_id",
            how="inner",
        )
        .join(
            df_wrk.select([
                "openalex_id", "ano_publicacao", "tipo_producao", "journal_name",
                "qtd_citacoes_producao", "qtd_referencias_producao",
            ]),
            left_on="openalex_producao_id",
            right_on="openalex_id",
            how="inner",
        )
    )

    cols = [
        "lattes_id", "openalex_producao_id", "ano_publicacao", "tipo_producao",
        "journal_name", "qtd_citacoes_producao", "qtd_referencias_producao",
        "ordem_autoria", "autor_principal", "correspondente",
    ]
    cols_present = [c for c in cols if c in df_fato.columns]
    records = [tuple(r[c] for c in cols_present) for r in df_fato.select(cols_present).to_dicts()]
    cols_list = ",".join(cols_present)

    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {SCHEMA}.fato_producao CASCADE")
        execute_values(
            cur,
            f"""
            INSERT INTO {SCHEMA}.fato_producao (
                id_producao, id_pesquisador, id_tempo, id_tipo_producao, id_journal,
                qtd_citacoes_producao, qtd_referencias_producao,
                ordem_autoria, autor_principal, correspondente
            )
            SELECT
                dp.id_producao,
                dpes.id_pesquisador,
                dt.id_tempo,
                dtp.id_tipo_producao,
                dj.id_journal,
                src.qtd_citacoes_producao::INTEGER,
                src.qtd_referencias_producao::INTEGER,
                src.ordem_autoria::INTEGER,
                src.autor_principal,
                src.correspondente
            FROM (VALUES %s) AS src (
                lattes_id, openalex_producao_id, ano_publicacao, tipo_producao,
                journal_name, qtd_citacoes_producao, qtd_referencias_producao,
                ordem_autoria, autor_principal, correspondente
            )
            LEFT JOIN {SCHEMA}.dim_pesquisador dpes ON dpes.lattes_id = src.lattes_id
            LEFT JOIN {SCHEMA}.dim_producao dp ON dp.openalex_id = src.openalex_producao_id
            LEFT JOIN {SCHEMA}.dim_tempo dt ON dt.ano = src.ano_publicacao
            LEFT JOIN {SCHEMA}.dim_tipo_producao dtp ON dtp.tipo_producao = src.tipo_producao
            LEFT JOIN {SCHEMA}.dim_journal dj ON dj.journal_name = src.journal_name
            ON CONFLICT DO NOTHING
            """,
            records,
        )
    print(f"  Inseridos {len(records)} registros na fato_producao")


def execute(silver_date: str | None = None):
    print("=" * 60)
    print("CAMADA GOLD - STAR SCHEMA (Power BI)")
    print("=" * 60)

    _date = _resolve_silver_date(silver_date)
    globals()["SILVER_DATE"] = _date

    try:
        conn = get_conn()
    except Exception as e:
        print(f"[ERRO] Nao foi possivel conectar ao PostgreSQL: {e}")
        print("[STAR] Carga ignorada. Verifique se o banco esta rodando.")
        return

    try:
        ensure_schema(conn)
        create_tables(conn)
        load_dim_tempo(conn)
        load_dim_pesquisador(conn)
        df_works = load_dim_producao(conn)
        load_dim_tipo_producao(conn, df_works)
        load_dim_journal(conn, df_works)
        load_fato_producao(conn)
        print("\n[STAR] Carga concluida com sucesso!")
    finally:
        conn.close()


if __name__ == "__main__":
    import sys
    silver = sys.argv[1] if len(sys.argv) > 1 else None
    execute(silver_date=silver)
