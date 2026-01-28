from datetime import datetime, timezone
from azure.cosmos.exceptions import CosmosResourceNotFoundError
import os
from dotenv import load_dotenv
load_dotenv()
import uuid
from azure.cosmos import CosmosClient
from utils.log_utils import logger, debug_print
import logging

# Suppress verbose Azure Cosmos HTTP logging
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.core.pipeline").setLevel(logging.WARNING)
logging.getLogger("azure").setLevel(logging.WARNING)

COSMOS_CONNECTION_STRING = os.getenv("COSMOS_CONNECTION_STRING")
COSMOS_DB_NAME = os.getenv("COSMOS_DB_NAME")
COSMOS_CONTAINER_NAME = os.getenv("COSMOS_CONTAINER_NAME")

    # Initialize Cosmos DB client
try:
    cosmos_client = CosmosClient.from_connection_string(COSMOS_CONNECTION_STRING)
    database = cosmos_client.get_database_client(COSMOS_DB_NAME)
    messages_container = database.get_container_client("chat_messages")
    sessions_container = database.get_container_client("chat_sessions")
    cosmos_enabled = True
    logger.info("Cosmos DB connection established successfully")
except Exception as e:
    logger.error(f"Cosmos DB connection failed: {str(e)}")
    cosmos_enabled = False

def create_session_doc(user_id: str, session_id: str):
    sessions_container.create_item({
        "id": session_id,
        "user_id": user_id,
        "message_count": 0,
        "last_message": "",
        "last_message_at": datetime.now(timezone.utc).isoformat()
    })

def update_session_on_message(user_id: str, session_id: str, content: str):
    now = datetime.now(timezone.utc).isoformat()
    sessions_container.patch_item(
        item=session_id,
        partition_key=user_id,
        patch_operations=[
            {
                "op": "set",
                "path": "/last_message",
                "value": content[:200],
            },
            {
                "op": "set",
                "path": "/last_message_at",
                "value": now,
            },
            {
                "op": "incr",
                "path": "/message_count",
                "value": 1,
            },
        ],
    )

def save_message_to_cosmos(session_id: str, user_id:str, user_roles:list[str], role: str, content: str, sources: list[dict] | None = None):
    """Save a message to Cosmos DB"""
    if not cosmos_enabled:
        debug_print("Cosmos DB not enabled, skipping message save")
        return
    print("\n=== SAVING MESSAGE TO COSMOS DB ===")
    try:
        pk = f"{user_id}#{session_id}"

        item = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "user_session_key": pk,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "thumbs_up": False,
            "thumbs_down": False
        }

        if role == "assistant" and sources:
            item["sources"] = sources

        messages_container.create_item(item)
        return item["id"]
    except Exception as e:
        debug_print(f"Failed to save message to Cosmos DB: {str(e)}")


def get_messages_for_session(user_id: str, session_id: str):
    pk = f"{user_id}#{session_id}"

    query = """
    SELECT c.id, c.role, c.content, c.timestamp, c.sources, c.thumbs_up, c.thumbs_down
    FROM c
    ORDER BY c.timestamp ASC
    """

    return list(
        messages_container.query_items(
            query=query,
            partition_key=pk
        )
    )


def update_feedback(
    message_id: str,
    session_id: str,
    user_id: str,
    thumbs_up: bool,
    thumbs_down: bool
):
    """
    Update thumbs up / thumbs down feedback for a message.

    - Container: chat_messages
    - Partition key: user_session_key = user_id#session_id
    - Uses PATCH (no read + replace)
    """

    # 🔑 Correct partition key
    partition_key = f"{user_id}#{session_id}"

    logger.info("Updating feedback for message")
    logger.debug(
        f"message_id={message_id}, "
        f"partition_key={partition_key}, "
        f"thumbs_up={thumbs_up}, "
        f"thumbs_down={thumbs_down}"
    )

    # 🔒 Enforce exclusive feedback
    if thumbs_up and thumbs_down:
        raise ValueError("thumbs_up and thumbs_down cannot both be True")

    try:
        patch_ops = [
            {"op": "set", "path": "/thumbs_up", "value": thumbs_up},
            {"op": "set", "path": "/thumbs_down", "value": thumbs_down},
            {
                "op": "set",
                "path": "/feedback_updated_at",
                "value": datetime.now(timezone.utc).isoformat()
            }
        ]

        messages_container.patch_item(
            item=message_id,
            partition_key=partition_key,
            patch_operations=patch_ops
        )

        logger.info("✅ Feedback updated successfully")

        # ✅ Shape matches app.py expectations
        return {
            "id": message_id,
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down
        }

    except CosmosResourceNotFoundError:
        logger.error(
            f"❌ Message not found "
            f"(id={message_id}, pk={partition_key})"
        )
        raise

    except Exception as e:
        logger.exception("❌ Failed to update feedback")
        raise

def get_last_messages_for_session(user_id: str, session_id: str, limit: int = 5):
    if not cosmos_enabled:
        return []

    partition_key = f"{user_id}#{session_id}"

    query = """
    SELECT TOP @limit c.id, c.role, c.content, c.timestamp
    FROM c
    ORDER BY c.timestamp DESC
    """

    parameters = [
        {"name": "@limit", "value": limit}
    ]

    items = list(
        messages_container.query_items(
            query=query,
            parameters=parameters,
            partition_key=partition_key   # 🚀 SINGLE PARTITION
        )
    )

    # Reverse so oldest → newest for LLM
    return list(reversed(items))


def get_sessions_for_sidebar(user_id: str, limit: int = 10):
    query = """
    SELECT TOP @limit c.id, c.last_message, c.last_message_at, c.message_count
    FROM c
    WHERE c.user_id = @user_id
    ORDER BY c.last_message_at DESC
    """

    params = [
        {"name": "@user_id", "value": user_id},
        {"name": "@limit", "value": limit}
    ]

    return list(
        sessions_container.query_items(
            query=query,
            parameters=params,
            partition_key=user_id
        )
    )


def delete_session_messages(user_id: str, session_id: str):
    pk = f"{user_id}#{session_id}"

    items = list(
        messages_container.query_items(
            "SELECT c.id FROM c",
            partition_key=pk
        )
    )

    for item in items:
        messages_container.delete_item(item["id"], pk)

def delete_session_doc(user_id: str, session_id: str):
    sessions_container.delete_item(session_id, user_id)

