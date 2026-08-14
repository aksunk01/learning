import pymupdf

from .base import DocumentElement, DocumentParser, ParsedDocument

class PDFParser(DocumentParser):

    def parse(self, file_path: str) -> ParsedDocument:
        document = pymupdf.open(file_path)

        elements: list[DocumentElement] = []

        try:
            for page_index, page in enumerate(document):
                text = page.get_text()

                element = DocumentElement(
                    text=text,
                    page_number=page_index+1,
                    metadata=self._get_element_metadata(
                        file_path
                    )
                )

                elements.append(element)
        finally:
            document.close()
        
        return ParsedDocument(
            elements=elements,
            metadata=self._get_file_metadata(
                file_path,
                "pdf"
            )
        )