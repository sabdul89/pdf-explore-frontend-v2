"use client";

import { useEffect, useState, useRef } from "react";
import { pdfjs } from "react-pdf";

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfViewer({
  file,
  pdfUrl,
  sections,
  setSections,
  selectedIds,
  setSelectedIds,
}) {
  const containerRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageCanvases, setPageCanvases] = useState([]);
  const scale = 1.2;

  /* ----------------------------------------------------
     🚫 Placeholder if no PDF selected
     ---------------------------------------------------- */
  if (!file && !pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
        Upload a PDF to begin
      </div>
    );
  }

  /* ----------------------------------------------------
     📄 Load PDF
     ---------------------------------------------------- */
  useEffect(() => {
    if (!file && !pdfUrl) return;

    setLoading(true);

    const loadingTask = pdfjs.getDocument(file || pdfUrl);

    loadingTask.promise
      .then((loadedPdf) => {
        setPdf(loadedPdf);
        setLoading(false);
      })
      .catch((err) => {
        console.error("PDF load error:", err);
        setLoading(false);
      });
  }, [file, pdfUrl]);

  /* ----------------------------------------------------
     🖼️ Render all pages (scroll view)
     ---------------------------------------------------- */
  useEffect(() => {
    if (!pdf) return;

    const renderAllPages = async () => {
      const canvases = [];
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = "40px";
        canvas.style.border = "1px solid #ccc";

        const ctx = canvas.getContext("2d");

        await page.render({ canvasContext: ctx, viewport }).promise;

        canvases.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
          canvas,
        });
      }

      setPageCanvases(canvases);
    };

    renderAllPages();
  }, [pdf]);

  /* ----------------------------------------------------
     ✏️ Update section
     ---------------------------------------------------- */
  const updateSection = (id, updates) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  /* ----------------------------------------------------
     ✏️ Drag section
     ---------------------------------------------------- */
  const startDrag = (section, e) => {
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = section.x;
    const origY = section.y;

    const onMove = (ev) => {
      updateSection(section.id, {
        x: origX + (ev.clientX - startX),
        y: origY + (ev.clientY - startY),
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* ----------------------------------------------------
     ↔️ Resize section
     ---------------------------------------------------- */
  const startResize = (section, e) => {
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const origW = section.width;
    const origH = section.height;

    const onMove = (ev) => {
      updateSection(section.id, {
        width: Math.max(20, origW + (ev.clientX - startX)),
        height: Math.max(20, origH + (ev.clientY - startY)),
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* ----------------------------------------------------
     🖱️ Select section (multi-select with SHIFT)
     ---------------------------------------------------- */
  const toggleSelect = (id, e) => {
    e.stopPropagation();

    if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  /* ----------------------------------------------------
     📌 Render viewer + all pages
     ---------------------------------------------------- */
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-y-auto p-4 space-y-12"
      style={{ background: "#fafafa" }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
          Loading PDF…
        </div>
      )}

      {/* Render each page */}
      {pageCanvases.map((p) => (
        <div
          key={p.pageNumber}
          className="relative mx-auto"
          style={{ width: p.width }}
        >
          {/* Insert page canvas */}
          <div
            ref={(div) => {
              if (div && div.firstChild !== p.canvas) {
                div.innerHTML = "";
                div.appendChild(p.canvas);
              }
            }}
          />

          {/* Sections for this page ONLY */}
          {sections
            .filter((s) => s.page === p.pageNumber)
            .map((s) => (
              <div
                key={s.id}
                onMouseDown={(e) => toggleSelect(s.id, e)}
                className={`absolute border-2 ${
                  selectedIds.includes(s.id)
                    ? "border-blue-500 bg-blue-200/40"
                    : "border-red-500 bg-red-200/30"
                }`}
                style={{
                  left: s.x,
                  top: s.y,
                  width: s.width,
                  height: s.height,
                }}
              >
                {/* Drag handle */}
                <div
                  className="absolute inset-0 cursor-move"
                  onMouseDown={(e) => startDrag(s, e)}
                />

                {/* Resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize rounded"
                  onMouseDown={(e) => startResize(s, e)}
                />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
