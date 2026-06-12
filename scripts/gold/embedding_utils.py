import polars as pl
import numpy as np
from typing import List, Optional
from sentence_transformers import SentenceTransformer

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIM = 384

_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"Carregando modelo de embeddings: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def generate_embeddings(texts: List[str]) -> np.ndarray:
    if not texts:
        return np.array([], dtype=np.float32)
    model = _get_model()
    texts_clean = [t if t else "" for t in texts]
    embeddings = model.encode(texts_clean, show_progress_bar=True, normalize_embeddings=True)
    return embeddings


def embedding_to_pgvector(embedding: np.ndarray) -> str:
    if embedding.ndim == 1:
        vector_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
    else:
        vector_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
    return vector_str


def add_embedding_column(
    df: pl.DataFrame,
    source_column: str,
    target_column: str,
    batch_size: int = 100,
) -> pl.DataFrame:
    texts = df[source_column].to_list()
    embeddings = generate_embeddings(texts)
    embedding_strs = [embedding_to_pgvector(emb) for emb in embeddings]
    return df.with_columns(pl.Series(target_column, embedding_strs))
