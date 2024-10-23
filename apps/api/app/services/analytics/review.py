import openai
import logging
from pydantic import BaseModel

class TranscriptReview(BaseModel):
    review: str
    willing_to_leave_review: bool

def extract_review(conversation: str, shop_name: str):
    """Extracts both the review content and whether the user was willing to leave a review."""
    model = "gpt-4o-mini"
    
    message_dicts = [
        {
            "role": "system",
            "content": (
                f"Your job is to summarize whether or not the user was willing to leave a review "
                f"and also provide a compelling review for {shop_name} based on a conversation "
                f"between one of {shop_name}'s employees and a customer. The review should be from the "
                f"customer's perspective, using their words. ONLY GIVE ME THE REVIEW AND WHETHER "
                f"THEY WERE WILLING TO LEAVE A REVIEW."
            )
        },
        {"role": "user", "content": conversation},
    ]
    
    try:
        completion = openai.chat.completions.create(
            model=model,
            messages=message_dicts,
            temperature=0.3
        )
        
        completion_content = completion.choices[0].message.content
        
        parsed_completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Extract the review and the user's willingness to leave a review."},
                {"role": "user", "content": completion.choices[0].message.content}
            ],
            response_format=TranscriptReview,
        )
        
        # Extract parsed data
        parsed_result = parsed_completion.choices[0].message.parsed
        
        review = parsed_result.review
        willing_to_leave_review = parsed_result.willing_to_leave_review
    
    except Exception as e:
        logging.error(f"Error in OpenAI parsing: {e}")
        review = None
        willing_to_leave_review = None

    return {
        "review": review,
        "willing_to_leave_review": willing_to_leave_review,
    }
