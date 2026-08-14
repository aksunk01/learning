from pathlib import Path

from .base import DocumentElement, DocumentParser, ParsedDocument

class TXTParser(DocumentParser):

    def parse(self, file_path: str) -> ParsedDocument:
        path = Path(file_path)

        text = path.read_text(encoding="utf-8")

        element = DocumentElement(
            text=text,
            metadata={
                "file_name": path.name,
            },
        )

        return ParsedDocument(
            elements=[element],
            metadata={
                "file_name": path.name,
                "file_type": "txt",
            },
        )