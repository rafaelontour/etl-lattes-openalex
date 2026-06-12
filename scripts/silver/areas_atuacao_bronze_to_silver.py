import polars as pl
from utils import build_data_storage_path, save_parquet_into_data_storage, create_timestamp_column, get_latest_date


class AreasAtuacaoBronzeToSilver:
    def __init__(self, execution_date):
        self.execution_date = execution_date
        self.execution_date_str = execution_date.strftime('%d%m%Y')

        self.source_name = "lattes"
        self.entity = "areas_atuacao"

        bronze_date = get_latest_date("01-bronze", "lattes", "areas_atuacao") or self.execution_date_str
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
            "sequencia": "sequencia",
            "nome_grande_area": "nome_grande_area",
            "codigo_grande_area": "codigo_grande_area",
            "nome_area": "nome_area",
            "codigo_area": "codigo_area",
            "nome_sub_area": "nome_sub_area",
            "codigo_sub_area": "codigo_sub_area",
            "nome_especialidade": "nome_especialidade",
            "codigo_especialidade": "codigo_especialidade",
        }

    def execute(self):
        parquet_file = list(self.bronze_read_path.glob("areas_atuacao_*.parquet"))
        if not parquet_file:
            print("No areas_atuacao parquet file found in bronze path.")
            return None

        df = pl.read_parquet(parquet_file[0])
        print(f"Lidas {df.height} linhas de areas_atuacao do bronze.")

        if df.height == 0:
            print("Areas_atuacao table is empty.")
            return None

        df = df.rename({k: v for k, v in self.rename_mapping.items() if k in df.columns})
        df = create_timestamp_column(df)

        save_parquet_into_data_storage(df, self.silver_write_path, self.execution_date_str, self.entity)
        print(f"Salvas {df.height} linhas de areas_atuacao no silver.")
        return df
