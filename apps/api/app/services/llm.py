import logging
from typing import List
from app.core.config import settings
from app.services.pinecone.utils import chunker
import httpx
from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings
from app.core.config import settings
from langfuse import Langfuse
from langfuse.openai import AsyncOpenAI as LangfuseAsyncOpenAI
from openai import AsyncOpenAI

langfuse = Langfuse(
    secret_key=settings.LANGFUSE_SECRET_KEY,
    public_key=settings.LANGFUSE_PUBLIC_KEY,
    host=settings.LANGFUSE_HOST,
)

async_openai_client = LangfuseAsyncOpenAI(api_key=settings.OPENAI_API_KEY)


http_aclient_syntag_eastus = httpx.AsyncClient()

azure_gpt4o_mini = LangfuseAsyncOpenAI(
    base_url="https://syntag-eastus.openai.azure.com/openai/deployments/gpt-4o-mini",
    default_headers={"api-key": settings.AZURE_AI_HUB_KEY, "Connection": "keep-alive"},
    default_query={"api-version": "2023-03-15-preview"},
    http_client=http_aclient_syntag_eastus,
)

azure_text3large_embedding = AsyncOpenAI(
    base_url="https://syntag-eastus.openai.azure.com/openai/deployments/text-embedding-3-large",
    default_headers={"api-key": settings.AZURE_AI_HUB_KEY, "Connection": "keep-alive"},
    default_query={"api-version": "2023-05-15"},
    http_client=http_aclient_syntag_eastus,
)


azure_text3large_embedding_westus3 = AsyncOpenAI(
    base_url="https://syntag-westus3.openai.azure.com/openai/deployments/text-embedding-3-large-westus3",
    default_headers={
        "api-key": settings.AZURE_AI_HUB_KEY_WESTUS3,
        "Connection": "keep-alive",
    },
    default_query={"api-version": "2023-05-15"},
)

azure_text3large_embedding_canadaeast = AsyncOpenAI(
    base_url="https://syntag-canadaeast.openai.azure.com/openai/deployments/text-embedding-3-large-canadaeast",
    default_headers={
        "api-key": settings.AZURE_AI_HUB_KEY_CANADAEAST,
        "Connection": "keep-alive",
    },
    default_query={"api-version": "2023-05-15"},
)

#Using langchain version as input to semantic chunker
langchain_openai_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small", api_key=settings.OPENAI_API_KEY
)

langchain_azure_embeddings_westus3 = AzureOpenAIEmbeddings(
    openai_api_key=settings.AZURE_AI_HUB_KEY_WESTUS3,
    default_query={"api-version": "2023-05-15"},
    model="text-embedding-3-large",
    openai_api_base="https://syntag-westus3.openai.azure.com/openai/deployments/text-embedding-3-large-westus3",
)
langchain_azure_embeddings_canadaeast = AzureOpenAIEmbeddings(
    openai_api_key=settings.AZURE_AI_HUB_KEY_CANADAEAST,
    default_query={"api-version": "2023-05-15"},
    model="text-embedding-3-large",
    openai_api_base="https://syntag-canadaeast.openai.azure.com/openai/deployments/text-embedding-3-large-canadaeast",
)


async def create_embeddings_ingest(data: List[str]):
    model: str = "text-embedding-3-large"
    embeddings = []
    for chunk in chunker(data, batch_size=2048):
        try:
            em = await async_openai_client.embeddings.create(model=model, input=chunk)
        except Exception as e:
            logging.warn(
                f"Error openai embedding: {e}",
            )
            try:
                em = await azure_text3large_embedding_canadaeast.embeddings.create(
                    model=model, input=chunk
                )
            except Exception as e:
                logging.warn(
                    f"Error azure_text3large_embedding_canadaeast embedding: {e}",
                )
                try:
                    em = await azure_text3large_embedding_westus3.embeddings.create(
                        model=model, input=chunk
                    )
                except Exception as e:
                    logging.warn(
                        f"Error azure_text3large_embedding_westus3 embedding: {e}",
                    )
                    raise e

        for i in em.data:
            embeddings.append(i.embedding)

    return embeddings

