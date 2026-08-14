from dataclasses import dataclass, field
from abc import ABC, abstractmethod

@dataclass
class DocumentElement:
    text: str
    page_number: int | None = None
    slide_number: int | None = None
    section: str | None = None
    metadata: dict[str, object] = field(default_factory=dict)

@dataclass
class ParsedDocument:
    elements: list[DocumentElement]
    metadata: dict[str,object] = field(default_factory=dict)

class DocumentParser(ABC):

    @abstractmethod
    def parse(self, file_path: str) -> ParsedDocument:
        """Parse a document into a structured representation. """
        raise NotImplementedError