"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/webpack";

export default function PdfViewer({
  pdfData,
  sections,
  setSections,
  selectedIds,
  setSelectedIds
}) {
  const canvasRefs = useRef({});
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);

  // ---------------------------------------
  // Load PDF only when pdfData exists
  // ---------------------------------------
  useEffect(() => {
    if (!pdfData) return;

    const load = async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        setNumPages(pdf.numPages);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = canvasRefs.current[i];
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        console.error("PDF load error:", err);
      }
    };

    load();
  }, [pdfData]);

  const toggleSelect = (id, event) => {
    event.stopPropagation();

    if (event.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  return (
    <div className="w-full overflow-auto bg-gray-100 p-4" ref={containerRef}>
      {!pdfData && (
        <div className="text-center text-gray-500 py-20 text-xl">
          Upload a PDF to begin
        </div>
      )}

      {pdfData &&
        [...Array(numPages)].map((_, i) => {
          const pageNum = i + 1;
          return (
            <div key={pageNum} className="relative mb-10">
              <canvas ref={(el) => (canvasRefs.current[pageNum] = el)} />

              {sections
                .filter((s) => s.page === pageNum)
                .map((s) => (
                  <div
                    key={s.id}
                    onMouseDown={(e) => toggleSelect(s.id, e)}
                    className={`absolute border-2 ${
                      selectedIds.includes(s.id)
                        ? "border-blue-500 bg-blue-200/20"
                        : "border-red-500 bg-red-200/20"
                    }`}
                    style={{
                      top: s.y,
                      left: s.x,
                      width: s.width,
                      height: s.height
                    }}
                  />
                ))}
            </div>
          );
        })}
    </div>
  );
}
