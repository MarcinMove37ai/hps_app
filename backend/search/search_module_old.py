from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, List, Any
import os
from unidecode import unidecode
from dotenv import load_dotenv
import logging
import kdbai_client as kdbai
import voyageai
import pandas as pd
import numpy as np
from transformers import AutoTokenizer
from collections import Counter

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class SearchParams(BaseModel):
    queries: List[str]
    search_type: str = "semantic"
    top_k: int = Field(default=5, ge=1, le=20)
    alpha: Optional[float] = Field(default=0.5, ge=0.0, le=1.0)

    @validator('alpha')
    def validate_alpha(cls, v, values):
        if values.get('search_type') != 'hybrid' and v is not None:
            raise ValueError('alpha should only be provided for hybrid search')
        if values.get('search_type') == 'hybrid':
            return v if v is not None else 0.5
        return None

    @validator('queries')
    def validate_queries(cls, v):
        if not v or not any(query.strip() for query in v):
            raise ValueError('At least one non-empty query is required')
        return [query.strip() for query in v if query.strip()]


class SearchResult(BaseModel):
    results: List[Dict[str, Any]]
    total_found: int


class SearchModule:
    def __init__(self):
        load_dotenv()
        logger.info("Starting SearchModule initialization...")

        try:
            self.kdbai_session = kdbai.Session(
                api_key=os.getenv('KDBAI_API_KEY'),
                endpoint=os.getenv('KDBAI_ENDPOINT')
            )
            logger.info("KDB.ai session initialized")

            self.db = self.kdbai_session.database("PubMed_Trials_2509")
            self.table = self.db.table("Sonet_Voyage3_document")
            logger.info("Database connection established")

            self.vo_client = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))
            self.tokenizer = AutoTokenizer.from_pretrained('voyageai/voyage-3')
            logger.info("NLP components initialized")

        except Exception as e:
            logger.error(f"Error during initialization: {str(e)}")
            raise

    def _remove_diacritics(self, texts: List[str]) -> List[str]:
        """Usuwa znaki diakrytyczne z listy tekstów."""
        return [unidecode(text) for text in texts]

    def _create_sparse_vector(self, text: str) -> Dict[str, float]:
        """Tworzy wektor rzadki dla pojedynczego tekstu."""
        try:
            if not isinstance(text, str) or not text.strip():
                return {}

            tokens = self.tokenizer.encode(text, truncation=True)
            token_counts = Counter(tokens)

            # Usuń tokeny specjalne
            token_counts.pop(101, None)  # [CLS]
            token_counts.pop(102, None)  # [SEP]

            return {str(k): float(v) for k, v in token_counts.items()}

        except Exception as e:
            logger.error(f"Error creating sparse vector: {str(e)}")
            return {}

    def _combine_sparse_vectors(self, texts: List[str]) -> Dict[str, float]:
        """Łączy wektory rzadkie z wielu tekstów w jeden znormalizowany wektor."""
        try:
            logger.info(f"Combining sparse vectors for {len(texts)} texts")
            combined_counts: Dict[str, float] = {}

            # Sumowanie liczby wystąpień tokenów ze wszystkich tekstów
            for text in texts:
                vector = self._create_sparse_vector(text)
                for token, count in vector.items():
                    if token in combined_counts:
                        combined_counts[token] += count
                    else:
                        combined_counts[token] = count

            # Normalizacja wektora
            total_count = sum(combined_counts.values())
            if total_count > 0:
                combined_counts = {
                    k: v / total_count for k, v in combined_counts.items()
                }

            logger.debug(f"Combined vector has {len(combined_counts)} unique tokens")
            return combined_counts

        except Exception as e:
            logger.error(f"Error combining sparse vectors: {str(e)}")
            return {}

    def _combine_dense_vectors(self, embeddings: List[List[float]]) -> List[float]:
        """Łączy wektory gęste poprzez uśrednienie."""
        try:
            if not embeddings:
                raise ValueError("No embeddings provided")

            # Konwersja na numpy array dla efektywnych obliczeń
            embeddings_array = np.array(embeddings)

            # Obliczenie średniej dla każdej wymiarowej
            mean_embedding = np.mean(embeddings_array, axis=0)

            # Normalizacja wektora wynikowego
            norm = np.linalg.norm(mean_embedding)
            if norm > 0:
                mean_embedding = mean_embedding / norm

            return mean_embedding.tolist()

        except Exception as e:
            logger.error(f"Error combining dense vectors: {str(e)}")
            raise

    def _process_results(self, df: pd.DataFrame, top_k: int) -> List[Dict[str, Any]]:
        """Przetwarza i filtruje wyniki wyszukiwania."""
        try:
            columns_to_keep = [
                'PMID', 'title', 'abstract', 'publication_date',
                'country', 'journal', 'domain_primary', 'domain_secondary',
                'trial_population', 'measured_outcomes', 'observed_outcomes',
                '__nn_distance', 'url'
            ]

            # Wybierz kolumny i usuń duplikaty, zachowując pierwszą instancję
            df_subset = df[columns_to_keep].copy()
            df_subset = df_subset.drop_duplicates(subset=['PMID'], keep='first')

            # Weź tylko top_k wyników bez sortowania
            df_subset = df_subset.head(top_k)

            # Konwertuj DataFrame na listę słowników
            results = []
            for _, row in df_subset.iterrows():
                result_dict = {}
                for col in df_subset.columns:
                    value = row[col]
                    if isinstance(value, (np.generic, np.ndarray)):
                        result_dict[col] = value.item() if isinstance(value, np.generic) else value.tolist()
                    else:
                        result_dict[col] = value

                    # Zachowaj oryginalną wartość __nn_distance
                    if col == '__nn_distance':
                        result_dict['similarity'] = value

                results.append(result_dict)

            return results

        except Exception as e:
            logger.error(f"Error processing results: {str(e)}")
            return []

    async def search(self, params: SearchParams) -> SearchResult:
        """Wykonuje wyszukiwanie z wykorzystaniem wybranej metody."""
        try:
            logger.info(f"Starting search with params: {params}")

            # Usuwanie znaków diakrytycznych z zapytań przed embeddingiem
            normalized_queries = self._remove_diacritics(params.queries)
            logger.debug(f"Normalized queries: {normalized_queries}")

            # Generowanie embeddingów dla znormalizowanych zapytań
            embeddings = self.vo_client.embed(
                texts=normalized_queries,
                model="voyage-3-large",
                input_type="query"
            ).embeddings

            # Kombinacja wektorów zapytań
            combined_embedding = self._combine_dense_vectors(embeddings)
            # Dla sparse vectors używamy oryginalnych zapytań, bo tokenizer poradzi sobie z polskimi znakami
            combined_sparse = self._combine_sparse_vectors(params.queries)

            # Dodajemy margines do liczby wyników dla lepszej jakości
            search_params = {'n': min(round(params.top_k * 1.5), 20)}

            # Wykonanie odpowiedniego typu wyszukiwania
            if params.search_type == 'semantic':
                results = self.table.search(
                    {'flat_index': [combined_embedding]},
                    **search_params
                )
            elif params.search_type == 'statistical':
                results = self.table.search(
                    {'sparse_index': [combined_sparse]},
                    **search_params
                )
            else:  # hybrid
                search_params['index_params'] = {
                    'flat_index': {'weight': params.alpha},
                    'sparse_index': {'weight': 1 - params.alpha}
                }
                results = self.table.search(
                    vectors={
                        'flat_index': [combined_embedding],
                        'sparse_index': [combined_sparse]
                    },
                    **search_params
                )

            if not results or len(results) == 0:
                logger.warning("No results found")
                return SearchResult(results=[], total_found=0)

            # Przetwarzanie wyników
            df = pd.DataFrame(results[0])
            processed_results = self._process_results(df, params.top_k)

            logger.info(f"Search completed, found {len(processed_results)} results")
            return SearchResult(
                results=processed_results,
                total_found=len(processed_results)
            )

        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            logger.exception("Full traceback:")
            raise