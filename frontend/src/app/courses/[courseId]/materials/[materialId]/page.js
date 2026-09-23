"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { getCourseMaterial, fetchCourseMaterialFile } from "@/lib/course-materials-api";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { Button } from "@/components/ui/button";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function MaterialViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docxContainerRef = useRef(null);

  const [material, setMaterial] = useState(null);
  const [blob, setBlob] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.push("/login");
      return;
    }

    let isCancelled = false;
    let objectUrl = null;

    const load = async () => {
      try {
        const [materialData, fileBlob] = await Promise.all([
          getCourseMaterial(params.courseId, params.materialId, token),
          fetchCourseMaterialFile(params.courseId, params.materialId, token),
        ]);

        if (isCancelled) return;

        objectUrl = URL.createObjectURL(fileBlob);
        setMaterial(materialData);
        setBlob(fileBlob);
        setDownloadUrl(objectUrl);
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || "Failed to load document");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [params.courseId, params.materialId, router]);

  useEffect(() => {
    if (!blob || !docxContainerRef.current) return;
    if (material?.mime_type !== DOCX_MIME_TYPE) return;

    let isCancelled = false;

    const renderDocx = async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        docxContainerRef.current.innerHTML = "";
        await renderAsync(blob, docxContainerRef.current, undefined, {
          ignoreWidth: true,
          ignoreHeight: true,
        });
      } catch (err) {
        if (!isCancelled) {
          setError(`Failed to render document: ${err.message}`);
        }
      }
    };

    renderDocx();

    return () => {
      isCancelled = true;
    };
  }, [blob, material]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <span className="font-medium truncate">
            {material?.name || "Document"}
          </span>
        </div>

        {downloadUrl && material && (
          <a
            href={downloadUrl}
            download={material.file_name}
            className="shrink-0"
          >
            <Button variant="outline" size="icon" aria-label="Download">
              <DownloadIcon className="h-5 w-5" />
            </Button>
          </a>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading document...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-destructive text-center px-4">
            {error}
          </div>
        ) : material?.mime_type?.startsWith("application/pdf") ? (
          <div className="max-w-3xl mx-auto p-2 sm:p-4">
            <PdfViewer blob={blob} />
          </div>
        ) : material?.mime_type === DOCX_MIME_TYPE ? (
          <div
            ref={docxContainerRef}
            className="docx-viewer max-w-3xl mx-auto p-4 bg-white text-black overflow-hidden"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
            <p className="text-muted-foreground">
              Preview isn&apos;t available for this file type.
            </p>
            {downloadUrl && material && (
              <a href={downloadUrl} download={material.file_name}>
                <Button>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download {material.file_name}
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
