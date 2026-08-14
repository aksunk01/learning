import pymupdf

from pathlib import Path

from .base import DocumentElement, DocumentParser, ParsedDocument

class PDFParser(DocumentParser):

    def parse(self, file_path: str) -> ParsedDocument:
        path = Path(file_path)
        document = pymupdf.open(file_path)

        elements: list[DocumentElement] = []

        try:
            for page_index, page in enumerate(document):
                text = page.get_text()

                element = DocumentElement(
                    text=text,
                    page_number=page_index+1,
                    metadata={
                        "file_name": path.name
                    }
                )

                elements.append(element)
        finally:
            document.close()
        
        return ParsedDocument(
            elements=elements,
            metadata={
                "file_name": path.name,
                "file_type": "pdf"
            }
        )