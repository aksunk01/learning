

from .base import DocumentElement, DocumentParser, ParsedDocument

class TXTParser(DocumentParser):

    def parse(self, file_path: str) -> ParsedDocument:
        text = open(file_path, encoding="utf-8").read()

        element = DocumentElement(
            text=text,
            metadata=self._get_element_metadata(file_path)
        )

        return ParsedDocument(
            elements=[element],
            metadata=self._get_file_metadata(
                file_path,
                "txt"
            )
        )