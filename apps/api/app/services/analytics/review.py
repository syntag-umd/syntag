import logging
from typing import List

import openai
from app.database.tables.message import Message
from app.models.enums import Role
from app.utils import get_token_count


def extract_review(conversation: str, shop_name: str):
    """Summarizes based on the beginning and end of the conversation"""
    model = "gpt-4o-mini"
    
    try:
        
        review = openai.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Your job is to write a compelling review for {shop_name} based on a conversation between one of {shop_name}'s employees and a customer. Make sure the review accurately portrays the user's opinion, and uses as many of their words as possible. The review should be written from the customer's point of view. ONLY GIVE ME THE REVIEW, AND NOTHING ELSE",
                },
                {"role": "user", "content": conversation},
            ],
            temperature=0.3,
        )
        
        review_content = review.choices[0].message.content
    
    except Exception as e:
        logging.error(
            f"Error openai summarization: {e}",
        )
        review_content = None

    return review_content
