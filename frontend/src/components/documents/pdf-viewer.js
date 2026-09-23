"use client";

import { useEffect, useRef, useState } from "react";

export function PdfViewer({ blob }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    if (!blob || !containerRef.current) return;

    let isCancelled = false;
    let pdfDoc = null;
    const container = containerRef.current;

    const render = async () => {
      setIsRendering(true);
      setError("");
      container.innerHTML = "";

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const arrayBuffer = await blob.arrayBuffer();

        if (isCancelled) return;

        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (isCancelled) return;

        const containerWidth = container.clientWidth;

        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          if (isCancelled) return;

          const page = await pdfDoc.getPage(pageNumber);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.className = "w-full h-auto mb-3 shadow-sm rounded";
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const context = canvas.getContext("2d");
          container.appendChild(canvas);

          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || "Failed to render PDF");
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      pdfDoc?.destroy();
    };
  }, [blob]);

  return (
    <div className="w-full">
      {isRendering && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading document...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-12 text-destructive text-center px-4">
          {error}
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
