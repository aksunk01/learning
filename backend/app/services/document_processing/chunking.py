from dataclasses import dataclass, field

from app.services.document_processing.parsers.base import DocumentElement, ParsedDocument

TARGET_CHUNK_TOKENS = 500
MAX_CHUNK_TOKENS = 700
OVERLAP_TOKENS=50
CHARS_PER_TOKEN = 4

@dataclass 
class DocumentChunk:
    content: str
    chunk_index: int

    page_start: int | None = None
    page_end: int | None = None
    slide_number: int | None = None
    section: str | None = None

    metadata: dict[str,object] = field(default_factory=dict)

    embedding: list[float] | None = None

def estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)

def chunk_document(document: ParsedDocument)-> list[DocumentChunk]:
    if not document.elements:
        return []

    chunks: list[DocumentChunk] = []

    current_elements: list[DocumentElement] =[]
    current_tokens = 0

    chunk_index = 0

    for element in document.elements:
        text = element.text.strip()

        if not text:
            continue
        
        element_tokens = estimate_tokens(text)

        if(current_elements and current_tokens + element_tokens > MAX_CHUNK_TOKENS):
            chunk = _build_chunk(current_elements, chunk_index)

            chunks.append(chunk)
            chunk_index+=1

            overlap_elements = _get_overlap_elements(current_elements)

            current_elements = overlap_elements
            current_tokens = sum(estimate_tokens(item.text) for item in current_elements)

        current_elements.append(element)
        current_tokens += element_tokens

        if current_tokens >= TARGET_CHUNK_TOKENS:
            chunk = _build_chunk(current_elements, chunk_index)

            chunks.append(chunk)
            chunk_index+=1

            overlap_elements = _get_overlap_elements(current_elements)

            current_elements = overlap_elements
            current_tokens = sum(estimate_tokens(item.text) for item in current_elements)

    if current_elements:
        chunks.append(_build_chunk(current_elements, chunk_index))

    return chunks

def _build_chunk(elements: list[DocumentElement], chunk_index: int) -> DocumentChunk:

    content = "\n\n".join(element.text.strip() for element in elements if element.text.strip())

    page_numbers = [element.page_number for element in elements if element.page_number is not None]

    slide_numbers = [element.slide_number for element in elements if element.slide_number is not None]

    sections = [element.section for element in elements if element.section]

    metadata: dict[str,object] = {}

    for element in elements:
        metadata.update(element.metadata)

    return DocumentChunk(
        content = content,
        chunk_index=chunk_index,
        page_start=min(page_numbers) if page_numbers else None,
        page_end=max(page_numbers) if page_numbers else None,
        slide_number = slide_numbers[0] if slide_numbers else None,
        section = sections[0] if sections else None,
        metadata=metadata
    )

def _get_overlap_elements(elements: list[DocumentElement]) -> list[DocumentElement]:

    overlap: list[DocumentElement] = []
    overlap_tokens = 0

    for element in reversed(elements):
        element_tokens = estimate_tokens(element.text)

        if(overlap and overlap_tokens + element_tokens > OVERLAP_TOKENS):
            break
        
        overlap.insert(0,element)
        overlap_tokens += element_tokens

        if overlap_tokens >= OVERLAP_TOKENS:
            break
    
    return overlap