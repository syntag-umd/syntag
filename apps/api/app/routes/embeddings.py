# We will use Zilliz to manage our vector embeddings
# https://zilliz.com/about

# We are going to embed conversations in two contexts:
# 1. Load in a dataset of tickets and embed the conversations
# 2. embed conversations one-by-one as they happen live

# In both cases, the embedding process is the same
# from a technical standpoint. Here is the embedding logic
# for a single conversation:

# Embed each question-response pair in the conversation
# 1. Embed the question, store the response in metadata
#      similar to a key-value store
# 2. For the first question-response pair, just store
#     the question embedding and the response.
# 3. For subsequent question-response pairs, also store
#     the previous question embedding and response embedding.
#     This allows us to calculate the similarity between
#     the current question and the previous question.
#     store the previous question embedding and response embedding
#     in metadata.
# 4.  Store the frontloaded reseponse in metadata. This will be
#     useful for the fast-stream response.

# Query the top-k most similar questions, under a distance
# threshold, to the current question.
# 1. Embed the current question
# 2. Query the embeddings for the previous questions
# 3. Calculate the similarity between the current question
# 4. If this is not the first question in the conversation,
#      calculate the similarity between the previous question
#      (live) and the previous questions embeddings.
# 5. Return the top-k most similar questions, under a distance
#      threshold, to the current question. We can minimize
#      the sum of distances or a weighted sum - these can
#      be hyperparameters. Also return the similarity
#      between the top-k responses - this is useful to determine
#      if the same response can be used to frontload the
#      final fast-stream response.

# Delete is straightforward for a single request. However,
# in the future it will be a good idea to delete embeddings
# within a certain distance threshold from a certain question,
# or even a file of information.

# We will use the Zilliz SDK to manage our embeddings. For each
# org, we will create a cluster and a collection:
# https://docs.zilliz.com/docs/quick-start#create-a-cluster
# https://docs.zilliz.com/docs/quick-start#create-a-collection
# We'll link the cluster and collection to the org.
# When deleting, delete the entire cluster.

import csv
import difflib
import io
import logging
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException
import requests
from sqlalchemy import delete
import tiktoken

from app.database.session import get_db
from app.database.tables.chunks import Chunk, SplitTypes
from app.database.tables.knowledge import Knowledge
from app.database.tables.user import User
from app.models.enums import DEFAULT_TOKEN_COUNT
from app.services.openai.utils import create_embeddings_ingest
from app.services.pinecone.utils import upsert_vectors
from app.utils import get_user_from_req
from pinecone.grpc import GRPCVector
from app.core.config import settings
from sqlalchemy.orm import Session

from langchain_community.document_loaders.doc_intelligence import (
    AzureAIDocumentIntelligenceLoader,
)
from langchain_core.documents import Document
from langchain_experimental.text_splitter import SemanticChunker
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google.protobuf.struct_pb2 import Struct
from markdownify import markdownify as md
import re
from app.services.pinecone.utils import pc_index
from app.services.openai.utils import (
    langchain_azure_embeddings_westus3,
    langchain_azure_embeddings_canadaeast,
    langchain_openai_embeddings,
)
from pinecone.core.openapi.shared.exceptions import PineconeException

router = APIRouter(prefix="/embeddings")


def load_docs_csv_url(url: str, csv_args={}, metadata_columns={}) -> List[Document]:
    response = requests.get(url)
    response.raise_for_status()

    csvfile = io.StringIO(response.text)
    csv_reader = csv.DictReader(csvfile, **csv_args)
    row_docs: List[Document] = []
    for i, row in enumerate(csv_reader):
        content = "\n".join(
            f"""{k.strip() if k is not None else k}: {v.strip()
            if isinstance(v, str) else ','.join(map(str.strip, v))
            if isinstance(v, list) else v}"""
            for k, v in row.items()
            if k not in metadata_columns
        )
        row_doc = Document(page_content=content)
        row_docs.append(row_doc)
    return row_docs


def load_docs_adi(url: str):
    adi = AzureAIDocumentIntelligenceLoader(
        "https://eastus.api.cognitive.microsoft.com",
        settings.AZURE_DOCUMENT_INTELLIGENCE_API_KEY,
        url_path=url,
        api_model="prebuilt-read",
    )
    docs = adi.load()
    return docs


def find_best_fuzzy_match(string, substring, max_iters=1000):
    """Finds the best match of a substring in a string.
    Returns the start_index of the best match."""
    best_ratio = 0
    best_index = -1

    for i in range(
        0, len(string) - len(substring) + 1, max(round(len(string) / max_iters), 1)
    ):
        window = string[i : i + len(substring)]  # noqa: E203

        ratio = difflib.SequenceMatcher(None, window, substring).ratio()

        if ratio > best_ratio:
            best_ratio = ratio
            best_index = i

    return best_index


def split_by_semantic(content: str, knowledge_uuid: str) -> List[Chunk]:
    split_type: SplitTypes = "semantic"

    embedders = [
        langchain_openai_embeddings,
        langchain_azure_embeddings_canadaeast,
        langchain_azure_embeddings_westus3,
    ]
    chunks = None
    for i, embedder in enumerate(embedders):
        try:
            semantic_splitter = SemanticChunker(
                embedder,
                add_start_index=True,
                sentence_split_regex=r"(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)(?=\s)",
            )
            chunks = semantic_splitter.split_documents([Document(page_content=content)])
            break
        except Exception as e:
            logging.warn(f"Error embedding {i}: {e}")

    if chunks is None:
        raise HTTPException(500, "Error embedding content semantically")

    MAX_SIZE = 8000
    recursive_splitter = RecursiveCharacterTextSplitter(
        chunk_size=MAX_SIZE, chunk_overlap=0
    )
    chunks = recursive_splitter.split_documents(chunks)

    db_chunks = []
    start_index = 0
    for i, chunk in enumerate(chunks):
        last_index = start_index + len(chunk.page_content) - 1
        new_db_chunk = Chunk(
            knowledgeUuid=knowledge_uuid,
            split_type=split_type,
            index=i,
            content_start_index=start_index,
            content_last_index=last_index,
        )
        start_index = last_index + 1
        db_chunks.append(new_db_chunk)

    return db_chunks


def split_by_tokens(content: str, knowledge_uuid: str) -> List[Chunk]:
    split_type: SplitTypes = "tokens"

    recursive_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=400, add_start_index=True
    )
    chunks = recursive_splitter.split_documents([Document(page_content=content)])
    db_chunks = []
    for i, chunk in enumerate(chunks):
        start_index = chunk.metadata.get("start_index", None)
        if start_index is None or start_index == -1:
            start_index = find_best_fuzzy_match(content, chunk.page_content)
            if start_index == -1:
                continue

        new_db_chunk = Chunk(
            knowledgeUuid=knowledge_uuid,
            split_type=split_type,
            index=i,
            content_start_index=start_index,
            content_last_index=start_index + len(chunk.page_content) + -1,
        )
        db_chunks.append(new_db_chunk)

    return db_chunks


def ingest_content(db: Session, content: str, knowledge_uuid: str, user: User):
    """Splits and ingests content of the knowledge"""

    semantic_db_chunks = split_by_semantic(content, knowledge_uuid)
    token_db_chunks = split_by_tokens(content, knowledge_uuid)

    db_chunks: List[Chunk] = semantic_db_chunks + token_db_chunks

    db.add_all(db_chunks)

    rows_updated = (
        db.query(Knowledge)
        .filter(Knowledge.uuid == knowledge_uuid)
        .update({Knowledge.content: content})
    )
    if rows_updated != 1:
        raise HTTPException(400, "Knowledge not found")

    db.flush()

    embedding_input = [
        content[i.content_start_index : i.content_last_index + 1]  # noqa: E203
        for i in db_chunks  # noqa: E203
    ]
    total_tokens = 0
    for i in embedding_input:
        encoding = tiktoken.encoding_for_model(DEFAULT_TOKEN_COUNT)
        tokens = encoding.encode(content)
        total_tokens += len(tokens)

    db.query(User).filter(User.uuid == user.uuid).update(
        {User.embedding_tokens: User.embedding_tokens - total_tokens}
    )

    db.flush()
    db.refresh(user)

    if user.embedding_tokens <= 0:
        raise HTTPException(403, "Not enough embedding tokens")

    embeddings = create_embeddings_ingest(embedding_input)

    if len(embeddings) != len(db_chunks):
        raise HTTPException(500, "Number of embeddings does not match number of chunks")

    pc_vectors: List[GRPCVector] = []
    for i in range(len(db_chunks)):
        pc_vector = {
            "id": f"{knowledge_uuid}#{db_chunks[i].id}",
            "values": embeddings[i],
            "metadata": {
                "knowledge_uuid": knowledge_uuid,
                "chunk_id": db_chunks[i].id,
            },
        }
        metadata_struct = Struct()
        metadata_struct.update(pc_vector["metadata"])
        pc_vectors.append(
            GRPCVector(
                id=pc_vector["id"],
                values=pc_vector["values"],
                metadata=metadata_struct,
            )
        )

    upsert_results = upsert_vectors(pc_vectors, str(user.uuid))

    db.commit()

    return {"upserted_count": upsert_results}


@router.post("/ingest-document")
def ingest_document_url(
    doc_url: str = Body(..., embed=True),
    knowledge_uuid: str = Body(..., embed=True),
    user: User = Depends(get_user_from_req),
    db: Session = Depends(get_db),
):
    if user.embedding_tokens <= 0:
        raise HTTPException(403, "Not enough embedding tokens")

    response = requests.head(doc_url)
    content_type = response.headers.get("Content-Type")

    if not content_type:
        raise HTTPException(400, "No content type found")

    content_type = content_type.lower()

    # Check the content type against known MIME types
    if "application/pdf" in content_type:
        docs = load_docs_adi(doc_url)

    elif "image/jpeg" in content_type:
        docs = load_docs_adi(doc_url)

    elif "image/png" in content_type:
        docs = load_docs_adi(doc_url)

    elif "image/bmp" in content_type:
        docs = load_docs_adi(doc_url)

    elif "image/tiff" in content_type:
        docs = load_docs_adi(doc_url)

    elif "image/heif" in content_type:
        docs = load_docs_adi(doc_url)

    elif (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        in content_type
    ):
        docs = load_docs_adi(doc_url)

    elif (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        in content_type
    ):
        docs = load_docs_adi(doc_url)
    elif (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        in content_type
    ):
        docs = load_docs_adi(doc_url)
    elif "text/plain" in content_type:
        res = requests.get(doc_url)
        res.raise_for_status()
        docs = [Document(page_content=res.text)]
    elif "text/markdown" in content_type:
        res = requests.get(doc_url)
        res.raise_for_status()
        docs = [Document(page_content=res.text)]
    elif "text/html" in content_type:
        res = requests.get(doc_url)
        res.raise_for_status()
        text = res.text
        md_content = md(text, stripe=["img", "svg"])
        stripped_conent = re.sub(r"\n\n\n+", "\n", md_content)
        docs = [Document(page_content=stripped_conent)]
    elif "text/csv" in content_type:
        docs = load_docs_csv_url(doc_url)
    else:
        raise HTTPException(
            400,
            "Unsupported content type. Only PDF, TXT, MD, HTML, DOCX, PPTX, JPEG, PNG, BMP, TIFF, HEIF, XLS, CSV are supported. Not "
            + content_type,
        )

    content = "\n".join([doc.page_content for doc in docs])
    return ingest_content(db, content, knowledge_uuid, user)


@router.post("/delete-document")
async def delete_document(
    knowledge_uuid: str = Body(..., embed=True),
    user: User = Depends(get_user_from_req),
    db: Session = Depends(get_db),
):
    """Deletes all chunks given a knowledge id"""

    delete_query = delete(Chunk).filter(Chunk.knowledgeUuid == knowledge_uuid)
    db.execute(delete_query)

    vector_ids = []
    listed_vectors = pc_index.list(
        prefix=f"{knowledge_uuid}#", namespace=str(user.uuid)
    )
    for ids in listed_vectors:
        vector_ids.extend(ids)
    if len(vector_ids) > 0:
        pc_index.delete(ids=vector_ids, namespace=str(user.uuid))

    db.commit()

    return {"deleted_count": len(vector_ids)}


@router.post("/offboard")
async def offboard(
    user: User = Depends(get_user_from_req),
):
    try:
        pc_index.delete(namespace=str(user.uuid), delete_all=True)
    except PineconeException as e:
        if "Namespace not found" in str(e):
            return {"message": "Namespace not found"}
        raise HTTPException(500, "Error offboarding") from e

    return {"message": "Deleted all embeddings for user"}
