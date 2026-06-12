#!/usr/bin/env python3
"""
Pipeline ETL - Executor completo.

Roda todas as etapas do pipeline em sequência com uma única data de execução.
Uso:
    uv run python run_pipeline.py
    uv run python run_pipeline.py --skip-api      # pula chamadas à OpenAlex
    uv run python run_pipeline.py --skip-load     # pula carga no PostgreSQL
    uv run python run_pipeline.py --skip-gold     # pula gold + PostgreSQL
"""

import sys
import argparse
import importlib.util
from datetime import datetime
from pathlib import Path

_THIS_FILE = Path(__file__).resolve()
_PROJECT_ROOT = _THIS_FILE.parent
_SCRIPTS_ROOT = _PROJECT_ROOT / "scripts"
sys.path.insert(0, str(_SCRIPTS_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT))


def _import_from_file(module_name: str, filepath: Path):
    spec = importlib.util.spec_from_file_location(module_name, str(filepath))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def step(msg: str):
    print(f"\n{'=' * 60}")
    print(f"  {msg}")
    print(f"{'=' * 60}")


def main():
    parser = argparse.ArgumentParser(description="Executa pipeline ETL completo")
    parser.add_argument("--skip-api", action="store_true", help="Pula chamadas à API OpenAlex")
    parser.add_argument("--skip-load", action="store_true", help="Pula carga no PostgreSQL")
    parser.add_argument("--skip-gold", action="store_true", help="Pula gold + PostgreSQL")
    args = parser.parse_args()

    execution_date = datetime.now()
    date_str = execution_date.strftime("%d%m%Y")
    print(f"Data de execução: {date_str} ({execution_date.strftime('%d/%m/%Y %H:%M')})")

    # ──────────────────────────────────────────────
    # STEP 1: Landing -> Bronze (Lattes XML -> parquet)
    # ──────────────────────────────────────────────
    step("1/6  Landing -> Bronze  (extração dos XMLs do Lattes)")
    from scripts.lattes.pesquisadores_landing_to_bronze import PesquisadoresLandingToBronze
    r = PesquisadoresLandingToBronze(execution_date).execute()
    if r is None:
        print("[AVISO] Landing -> Bronze retornou vazio. Verifique o arquivo lattesNAPI.zip")
    else:
        print("  OK")

    # ──────────────────────────────────────────────
    # STEP 2: OpenAlex Authors (API -> Bronze -> Silver)
    # ──────────────────────────────────────────────
    if not args.skip_api:
        step("2/6  API OpenAlex -> Bronze -> Silver  (authors)")
        api_mod = _import_from_file("authors_api", _SCRIPTS_ROOT / "open-alex" / "authors" / "authors_api_to_bronze.py")
        silver_mod = _import_from_file("authors_silver", _SCRIPTS_ROOT / "open-alex" / "authors" / "authors_bronze_to_silver.py")

        AuthorsApiToBronze = api_mod.AuthorsApiToBronze
        AuthorsBronzeToSilver = silver_mod.AuthorsBronzeToSilver

        r1 = AuthorsApiToBronze(execution_date).execute()
        if r1 is None:
            print("[AVISO] Nenhum autor encontrado na OpenAlex. Pulando...")
        else:
            print(f"  API OK ({len(r1)} autores)")
            r2 = AuthorsBronzeToSilver(execution_date).execute()
            if r2 is not None:
                print(f"  Silver OK ({r2.height} autores)")
    else:
        print("  (pulado via --skip-api)")

    # ──────────────────────────────────────────────
    # STEP 3: OpenAlex Works (API -> Bronze -> Silver)
    # ──────────────────────────────────────────────
    if not args.skip_api:
        step("3/6  API OpenAlex -> Bronze -> Silver  (works)")
        api_mod = _import_from_file("works_api", _SCRIPTS_ROOT / "open-alex" / "works" / "works_api_to_bronze.py")
        silver_mod = _import_from_file("works_silver", _SCRIPTS_ROOT / "open-alex" / "works" / "works_bronze_to_silver.py")

        WorksApiToBronze = api_mod.WorksApiToBronze
        WorksBronzeToSilver = silver_mod.WorksBronzeToSilver

        r1 = WorksApiToBronze(execution_date).execute()
        if r1 is None:
            print("[AVISO] Nenhuma obra encontrada na OpenAlex. Pulando...")
        else:
            print(f"  API OK ({len(r1)} obras)")
            r2 = WorksBronzeToSilver(execution_date).execute()
            if r2 is not None:
                print(f"  Silver OK ({r2.height} obras)")
    else:
        print("  (pulado via --skip-api)")

    # ──────────────────────────────────────────────
    # STEP 4: Bronze Lattes -> Silver (pesquisadores enriquecidos)
    # ──────────────────────────────────────────────
    step("4/6  Bronze -> Silver  (pesquisadores lattes + indice openalex)")
    from scripts.lattes.pesquisadores_bronze_to_silver import PesquisadoresBronzeToSilver
    r = PesquisadoresBronzeToSilver(execution_date).execute()
    if r is not None:
        print(f"  OK ({r.height} pesquisadores)")
    else:
        print("  [AVISO] Pesquisadores silver pode estar incompleto")

    # ──────────────────────────────────────────────
    # STEP 5: Bronze -> Silver (formacoes, areas_atuacao)
    # ──────────────────────────────────────────────
    step("5/6  Bronze -> Silver  (formacoes, areas_atuacao)")
    from scripts.silver.formacoes_bronze_to_silver import FormacoesBronzeToSilver
    from scripts.silver.areas_atuacao_bronze_to_silver import AreasAtuacaoBronzeToSilver

    FormacoesBronzeToSilver(execution_date).execute()
    AreasAtuacaoBronzeToSilver(execution_date).execute()
    print("  OK")

    # ──────────────────────────────────────────────
    # STEP 6: Gold + PostgreSQL
    # ──────────────────────────────────────────────
    if not args.skip_gold:
        step("6/6  Gold + PostgreSQL")
        from scripts.gold.consolidado_pesquisadores_producoes import execute as gold_execute
        gold_execute(silver_date=date_str, gold_date=date_str)
        print("  OK")
    elif args.skip_load:
        step("6/6  Gold (sem carga PostgreSQL)")
        from scripts.gold.consolidado_pesquisadores_producoes import build_gold_pesquisadores_producoes, build_gold_metricas_pesquisadores, _build_paths
        paths = _build_paths(date_str, date_str)
        df_prod = build_gold_pesquisadores_producoes(paths)
        df_metr = build_gold_metricas_pesquisadores(paths)
        if df_prod is not None:
            from scripts.utils import save_parquet_into_data_storage
            save_parquet_into_data_storage(df_prod, paths["gold_pesquisadores_producoes"], date_str, "pesquisadores_producoes")
        if df_metr is not None:
            from scripts.utils import save_parquet_into_data_storage
            save_parquet_into_data_storage(df_metr, paths["gold_metricas"], date_str, "metricas_pesquisadores")
        print("  Gold OK (PostgreSQL pulado)")
    else:
        step("6/6  (pulado via --skip-gold)")

    print(f"\n{'=' * 60}")
    print(f"  Pipeline finalizado! Data: {date_str}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
