import re

def remove_doc_references(text: str) -> str:
    """
    Remove all occurrences of [doc ...] from the text.
    """
    if not text:
        return text

    # Match [doc ... ] (non-greedy)
    pattern = r"\[doc.*?\]"
    cleaned_text = re.sub(pattern, "", text)

    return cleaned_text
