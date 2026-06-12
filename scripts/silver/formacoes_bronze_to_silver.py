import polars as pl
from utils import build_data_storage_path, save_parquet_into_data_storage, create_timestamp_column, get_latest_date


class FormacoesBronzeToSilver:
    def __init__(self, execution_date):
        self.execution_date = execution_date
        self.execution_date_str = execution_date.strftime('%d%m%Y')

        self.source_name = "lattes"
        self.entity = "formacoes"

        bronze_date = get_latest_date("01-bronze", "lattes", "formacoes") or self.execution_date_str
        self.bronze_read_path = build_data_storage_path(
            medallion_layer="01-bronze",
            date=bronze_date,
            source_name=self.source_name,
            entity=self.entity,
        )
        self.silver_write_path = build_data_storage_path(
            medallion_layer="02-silver",
            date=self.execution_date_str,
            source_name=self.source_name,
            entity=self.entity,
        )

        self.rename_mapping = {
            "lattes_id": "lattes_id",
            "tipo_formacao": "tipo_formacao",
            "codigo_curso": "codigo_curso",
            "nome_curso": "nome_curso",
            "codigo_instituicao": "codigo_instituicao",
            "nome_instituicao": "nome_instituicao",
            "status": "status",
            "ano_inicio": "ano_inicio",
            "ano_conclusao": "ano_conclusao",
            "titulo_trabalho": "titulo_trabalho",
            "nome_orientador": "nome_orientador",
            "titulo_dissertacao": "titulo_dissertacao",
            "codigo_agencia_financiadora": "codigo_agencia_financiadora",
            "nome_agencia": "nome_agencia",
            "titulo_tese": "titulo_tese",
        }

    def execute(self):
        parquet_file = list(self.bronze_read_path.glob("formacoes_*.parquet"))
        if not parquet_file:
            print("No formacoes parquet file found in bronze path.")
            return None

        df = pl.read_parquet(parquet_file[0])
        print(f"Lidas {df.height} linhas de formacoes do bronze.")

        if df.height == 0:
            print("Formacoes table is empty.")
            return None

        df = df.with_columns([
            pl.col("ano_inicio").cast(pl.Int64, strict=False),
            pl.col("ano_conclusao").cast(pl.Int64, strict=False),
        ])

        df = df.rename({k: v for k, v in self.rename_mapping.items() if k in df.columns})
        df = create_timestamp_column(df)

        save_parquet_into_data_storage(df, self.silver_write_path, self.execution_date_str, self.entity)
        print(f"Salvas {df.height} linhas de formacoes no silver.")
        return df
