"""
Thin wrapper around SentenceTransformer.

Loaded once per server lifetime and injected into SupabaseVectorRetriever.
encode() is synchronous (CPU/GPU-bound) — callers run it in a thread executor.
"""

import warnings

import torch
from sentence_transformers import SentenceTransformer


class EmbeddingModel:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self._model = SentenceTransformer(model_name, device=device)
        self.model_name = model_name
        self.dimension: int = self._model.get_sentence_embedding_dimension()
        print(f"[EMBED] {model_name} loaded on {device} ({self.dimension}d)")

    def encode(self, text: str) -> list[float]:
        """Return a normalised embedding as a plain Python list."""
        vec = self._model.encode(
            text,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return vec.tolist()
