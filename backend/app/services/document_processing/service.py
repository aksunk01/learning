from pathlib import Path

from app.services.document_processing.chunking import DocumentChunk, chunk_document
from app.services.document_processing.parsers.base import DocumentParser
from app.services.document_processing.parsers.docx import DOCXParser
from app.services.document_processing.parsers.pdf import PDFParser
from app.services.document_processing.parsers.pptx import PPTXParser
from app.services.document_processing.parsers.txt import TXTParser


class DocumentProcessingError(Exception):
    """Raised when document processing fails"""

class UnsupportedDocumentTypeError(DocumentProcessingError):
    """Raised when document type is not supported"""

class DocumentProcessingService:
    def __init__(self) -> None:
        self._parsers: dict[str, DocumentParser] ={
            ".pdf": PDFParser(),
            ".docx": DOCXParser(),
            ".pptx": PPTXParser(),
            ".txt": TXTParser()
        }

    def process(self, file_path: str)-> list[DocumentChunk]:
        path = Path(file_path)

        if not path.exists():
            raise DocumentProcessingError(
                f"Document does not exist: {file_path}"
            )
        
        if not path.is_file():
            raise DocumentProcessingError(
                f"Document path is not a file: {file_path}"
            )
        
        parser = self._get_parser(path.suffix)

        try:
            document = parser.parse(file_path)

            if not document.elements:
                raise DocumentProcessingError(
                    "Document contains no extractable content"
                )
            
            chunks = chunk_document(document)

            if not chunks:
                raise DocumentProcessingError(
                    "Document processing produced no chunks"
                )

            return chunks
        except DocumentProcessingError:
            raise
        except Exception as e:
            raise DocumentProcessingError(
                f"Failed to process document: {e}"
            ) from e

    def _get_parser(self, file_extension: str) -> DocumentParser:
        extension = file_extension.lower()

        parser=self._parsers.get(extension)

        if parser is None:
            raise UnsupportedDocumentTypeError(
                f"Unsupported document type: {extension or 'unknown'}"
            )

        return parser