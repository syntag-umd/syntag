import logging
from typing import List
from pinecone.grpc import PineconeGRPC as Pinecone
from app.core.config import settings
from pinecone.grpc import GRPCVector
from pinecone.grpc.index_grpc import UpsertResponse

pc = Pinecone(api_key=settings.PINECONE_API_KEY)
PC_INDEX_NAME = "knowledge"
pc_index = pc.Index(PC_INDEX_NAME, host=settings.PINECONE_HOST)


def chunker(seq, batch_size):
    return (
        seq[pos : pos + batch_size]  # noqa: E203
        for pos in range(0, len(seq), batch_size)  # noqa: E203
    )


def upsert_vectors(data: List[GRPCVector], user_uuid, batch_size=100):

    async_results = []
    for chunk in chunker(data, batch_size):
        async_results.append(
            pc_index.upsert(vectors=chunk, namespace=user_uuid, async_req=True)
        )

    results: List[UpsertResponse] = [
        async_result.result() for async_result in async_results
    ]
    try:
        return sum([result.upserted_count for result in results])
    except Exception as e:
        logging.error(f"ERROR {e}")
        return len(data)
