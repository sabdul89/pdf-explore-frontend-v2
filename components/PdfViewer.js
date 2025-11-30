"use client";

import { useEffect, useState, useRef } from "react";
import { pdfjs } from "react-pdf";

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
     🚫 Show placeholder when no PDF is selected
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
     🖼️ Render all pages
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
     ✏️ Section movement
     ---------------------------------------------------- */
  const updateSection = (id, updates) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

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

  const toggleSelect = (id, e) => {
    e.stopPropagation();

    if (e.shiftKey) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setSelectedIds([id]);
    }
  };

  /* ----------------------------------------------------
     📌 Render multi-page viewer
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

      {pageCanvases.map((p) => (
        <div key={p.pageNumber} className="relative mx-auto">
          {/* PDF Page Canvas */}
          <div
            dangerouslySetInnerHTML={{ __html: "" }}
            ref={(div) => {
              if (div && div.firstChild !== p.canvas) {
                div.innerHTML = "";
                div.appendChild(p.canvas);
              }
            }}
          />

          {/* Sections overlay for THIS page only */}
          {sections
            .filter((s) => s.page === p.pageNumber)
            .map((s) => (
              <div
                key={s.id}
                onMou
