from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from pathlib import Path

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

    def _get_file_metadata(self, file_path: str, file_type: str) -> dict[str,object]:
        path = Path(file_path)

        return {
            "file_name": path.name,
            "file_type": file_type
        }

    def _get_element_metadata(self, file_path: str, **additional_metadata: object) -> dict[str,object]:
        path = Path(file_path)

        return{
            "file_name": path.name,
            **additional_metadata
        }

    @abstractmethod
    def parse(self, file_path: str) -> ParsedDocument:
        """Parse a document into a structured representation. """
        raise NotImplementedError