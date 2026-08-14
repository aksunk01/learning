from docx import Document

from .base import DocumentElement, DocumentParser, ParsedDocument

class DOCXParser(DocumentParser):

    def parse(self, file_path: str) -> ParsedDocument:
        document = Document(file_path)

        elements: list(DocumentElement) = []
        current_section: str | None = None

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()

            if not text:
                continue

            style_name = paragraph.style.name if paragraph.style else ""

            if style_name.startswith("Title") or style_name.startswith("Heading"):
                current_section = text
            
            element = DocumentElement(
                text=text,
                section=current_section,
                metadata=self._get_element_metadata(
                    file_path
                )
            )

            elements.append(element)
        
        return ParsedDocument(
            elements=elements,
            metadata=self._get_file_metadata(
                file_path,
                "docx"
            )
        )