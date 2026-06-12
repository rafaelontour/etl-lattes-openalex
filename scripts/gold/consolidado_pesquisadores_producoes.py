import sys
import polars as pl
from pathlib import Path

_THIS_FILE = Path(__file__).resolve()
_PROJECT_ROOT = str(_THIS_FILE.parent.parent.parent)
_SCRIPTS_ROOT = str(_THIS_FILE.parent.parent)
sys.path.insert(0, _SCRIPTS_ROOT)
sys.path.insert(0, _PROJECT_ROOT)

from scripts.utils import build_data_storage_path, save_parquet_into_data_storage


SILVER_DATE = "24052026"
GOLD_DATE = "24052026"

SOURCE_SILVER = "open-alex"
SOURCE_LATTES = "lattes"

SILVER_AUTORES_PRODUCAO_PATH = build_data_storage_path(
    medallion_layer="02-silver",
    date=SILVER_DATE,
    source_name=SOURCE_SILVER,
    entity="autores_producao",
)
SILVER_WORKS_PATH = build_data_storage_path(
    medallion_layer="02-silver",
    date=SILVER_DATE,
    source_name=SOURCE_SILVER,
    entity="works",
)
SILVER_PESQUISADORES_PATH = build_data_storage_path(
    medallion_layer="02-silver",
    date=SILVER_DATE,
    source_name=SOURCE_LATTES,
    entity="pesquisadores",
)

GOLD_PESQUISADORES_PRODUCOES_PATH = build_data_storage_path(
    medallion_layer="03-gold",
    date=GOLD_DATE,
    source_name=SOURCE_LATTES,
    entity="pesquisadores_producoes",
)
GOLD_METRICAS_PESQUISADORES_PATH = build_data_storage_path(
    medallion_layer="03-gold",
    date=GOLD_DATE,
    source_name=SOURCE_LATTES,
    entity="metricas_pesquisadores",
)


def extract_openalex_id(url: str) -> str:
    return url.split("/")[-1] if url and "/" in url else url


def build_gold_pesquisadores_producoes() -> pl.DataFrame:
    parquet_aut = list(SILVER_AUTORES_PRODUCAO_PATH.glob("autores_producao_*.parquet"))
    parquet_wrk = list(SILVER_WORKS_PATH.glob("works_*.parquet"))
    parquet_pes = list(SILVER_PESQUISADORES_PATH.glob("pesquisadores_*.parquet"))

    if not all([parquet_aut, parquet_wrk, parquet_pes]):
        print("Parquet file not found in one of the silver paths.")
        return None

    df_aut = pl.read_parquet(parquet_aut[0])
    df_wrk = pl.read_parquet(parquet_wrk[0])
    df_pes = pl.read_parquet(parquet_pes[0])

    df_aut = df_aut.with_columns(
        pl.col("openalex_autor_id")
        .map_elements(extract_openalex_id, return_dtype=pl.String)
        .alias("openalex_autor_id_short")
    )

    df_pes_sel = df_pes.select([
        "lattes_id", "orcid_id", "openalex_id",
        "nome_completo", "resumo_cv",
        "indice_h", "indice_i10",
        "qtd_producoes", "qtd_citacoes_pesquisador",
        "nacionalidade", "instituicao_empresa", "nome_orgao",
    ])

    df_joined = (
        df_aut
        .join(df_pes_sel, left_on="openalex_autor_id_short", right_on="openalex_id", how="left")
        .join(df_wrk, left_on="openalex_producao_id", right_on="openalex_id", how="left", suffix="_work")
    )

    return df_joined


def build_gold_metricas_pesquisadores() -> pl.DataFrame:
    parquet_aut = list(SILVER_AUTORES_PRODUCAO_PATH.glob("autores_producao_*.parquet"))
    parquet_wrk = list(SILVER_WORKS_PATH.glob("works_*.parquet"))
    parquet_pes = list(SILVER_PESQUISADORES_PATH.glob("pesquisadores_*.parquet"))

    if not all([parquet_aut, parquet_wrk, parquet_pes]):
        return None

    df_aut = pl.read_parquet(parquet_aut[0])
    df_wrk = pl.read_parquet(parquet_wrk[0])
    df_pes = pl.read_parquet(parquet_pes[0])

    df_aut = df_aut.with_columns(
        pl.col("openalex_autor_id")
        .map_elements(extract_openalex_id, return_dtype=pl.String)
        .alias("openalex_autor_id_short")
    )

    df_wrk_sel = df_wrk.select([
        "openalex_id", "ano_publicacao", "tipo_producao",
        "qtd_citacoes_producao", "journal_name"
    ])

    df_per_pes = (
        df_aut
        .join(df_pes, left_on="openalex_autor_id_short", right_on="openalex_id", how="inner")
        .join(df_wrk_sel, left_on="openalex_producao_id", right_on="openalex_id", how="left")
    )

    metricas = df_per_pes.group_by(["lattes_id", "openalex_autor_id_short"]).agg([
        pl.col("openalex_producao_id").n_unique().alias("total_producoes_gold"),
        pl.col("qtd_citacoes_producao").sum().alias("total_citacoes_gold"),
        pl.col("qtd_citacoes_producao").mean().alias("media_citacoes_por_producao"),
        pl.col("ano_publicacao").min().alias("ano_primeira_producao"),
        pl.col("ano_publicacao").max().alias("ano_ultima_producao"),
        pl.col("tipo_producao").value_counts().alias("producoes_por_tipo"),
        pl.col("journal_name").n_unique().alias("total_periodicos_distintos"),
        (pl.col("autor_principal").sum()).alias("qtd_vezes_primeiro_autor"),
        (pl.col("correspondente").sum()).alias("qtd_vezes_autor_correspondente"),
    ])

    metricas = (
        df_pes.select(["lattes_id", "nome_completo", "orcid_id", "openalex_id",
                       "indice_h", "indice_i10", "nacionalidade", "instituicao_empresa"])
        .join(metricas, on="lattes_id", how="left")
    )

    return metricas


def execute():
    print("=== Construindo gold: pesquisadores_producoes ===")
    df_producoes = build_gold_pesquisadores_producoes()
    if df_producoes is not None:
        df_producoes = df_producoes.unique(subset=["openalex_producao_id", "openalex_autor_id_short"])
        save_parquet_into_data_storage(
            df_producoes, GOLD_PESQUISADORES_PRODUCOES_PATH,
            GOLD_DATE, "pesquisadores_producoes"
        )
        print(f"Salvo: {GOLD_PESQUISADORES_PRODUCOES_PATH} ({df_producoes.height} linhas)")
    else:
        print("Falha ao gerar pesquisadores_producoes.")

    print("\n=== Construindo gold: metricas_pesquisadores ===")
    df_metricas = build_gold_metricas_pesquisadores()
    if df_metricas is not None:
        save_parquet_into_data_storage(
            df_metricas, GOLD_METRICAS_PESQUISADORES_PATH,
            GOLD_DATE, "metricas_pesquisadores"
        )
        print(f"Salvo: {GOLD_METRICAS_PESQUISADORES_PATH} ({df_metricas.height} linhas)")
    else:
        print("Falha ao gerar metricas_pesquisadores.")

    _run_silver_promotions()
    _run_relacional_load()
    _run_star_schema_load()

    return 0


def _run_silver_promotions():
    from datetime import datetime
    from scripts.silver.formacoes_bronze_to_silver import FormacoesBronzeToSilver
    from scripts.silver.areas_atuacao_bronze_to_silver import AreasAtuacaoBronzeToSilver

    execution_date = datetime.now()
    print("\n=== Promovendo formacoes: bronze -> silver ===")
    FormacoesBronzeToSilver(execution_date).execute()
    print("\n=== Promovendo areas_atuacao: bronze -> silver ===")
    AreasAtuacaoBronzeToSilver(execution_date).execute()


def _run_relacional_load():
    print("\n=== Carregando banco relacional (PostgreSQL + pgvector) ===")
    try:
        from scripts.gold.load_relacional import execute as load_relacional
        load_relacional()
    except Exception as e:
        print(f"Erro ao carregar relacional: {e}")


def _run_star_schema_load():
    print("\n=== Carregando star schema (PostgreSQL Power BI) ===")
    try:
        from scripts.gold.load_star_schema import execute as load_star
        load_star()
    except Exception as e:
        print(f"Erro ao carregar star schema: {e}")


if __name__ == "__main__":
    execute()
