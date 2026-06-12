import polars as pl
from datetime import date, timedelta


def generate_dim_tempo(start_year: int = 2000, end_year: int = 2030) -> pl.DataFrame:
    rows = []
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            d = date(year, month, 1)
            trimester = (month - 1) // 3 + 1
            rows.append({
                "id_tempo": year * 100 + month,
                "ano": year,
                "mes": month,
                "trimestre": trimester,
                "data": d.isoformat(),
                "data_completa": d.strftime("%Y-%m-%d"),
            })
    return pl.DataFrame(rows)


def generate_dim_tempo_from_dates(dates: list) -> pl.DataFrame:
    unique_years = sorted(set(dates))
    return generate_dim_tempo(min(unique_years), max(unique_years))
