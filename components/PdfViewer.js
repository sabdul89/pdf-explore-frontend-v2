"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist/webpack"; // handles worker internally
import clsx from "clsx";

/**
 * Full-featured PdfViewer (client component)
 *
 * Props:
 * - pdfData: Uint8Array | ArrayBuffer | null
 * - pdfUrl: string | null
 * - sections, setSections
 * - fields, setFields
 * - selectedIds, setSelectedIds
 * - viewerDimsRef (optional) — ref to store per-page rendered dims
 */
export default function PdfViewer({
  pdfData = null,
  pdfUrl = null,
  sections = [],
  setSections = () => {},
  fields = [],
  setFields = () => {},
  selectedIds = [],
  setSelectedIds = () => {},
  viewerDimsRef = null,
}) {
  const containerRef = useRef(null);
  const pageContainersRef = useRef({}); // DOM containers for each page
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageCanvases, setPageCanvases] = useState([]); // {pageNumber, width, height, canvas}
  const scale = 1.25;

  // drawing state for creating new sections
  const drawingRef = useRef({ active: false, page: null, startX: 0, startY: 0 });

  const hasSource = Boolean(pdfData) || Boolean(pdfUrl);

  /* Load PDF when source exists */
  useEffect(() => {
    if (!hasSource) {
      setPdf(null);
      setPageCanvases([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const src = pdfData && pdfData.byteLength ? { data: pdfData } : pdfUrl ? { url: pdfUrl } : null;
        if (!src) {
          setPdf(null);
          setLoading(false);
          return;
        }
        const loadingTask = pdfjsLib.getDocument(src);
        const loadedPdf = await loadingTask.promise;
        if (cancelled) return;
        setPdf(loadedPdf);
        setLoading(false);
      } catch (err) {
        console.error("PdfViewer load error:", err);
        setPdf(null);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pdfData, pdfUrl, hasSource]);

  /* Render all pages into canvases */
  useEffect(() => {
    if (!pdf) {
      setPageCanvases([]);
      return;
    }

    let cancelled = false;
    const renderAll = async () => {
      const canvases = [];
      const total = pdf.numPages || 0;
      for (let i = 1; i <= total; i++) {
        if (cancelled) break;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.display = "block";
        canvas.style.margin = "0 auto 32px";
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvases.push({ pageNumber: i, width: canvas.width, height: canvas.height, canvas });
      }
      if (!cancelled) setPageCanvases(canvases);
    };

    renderAll();
    return () => { cancelled = true; };
  }, [pdf, scale]);

  /* Helpers */
  const updateSection = useCallback((id, updates) => {
    setSections((prev = []) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, [setSections]);

  const removeSection = useCallback((id) => {
    setSections((prev = []) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev = []) => prev.filter((x) => x !== id));
  }, [setSections, setSelectedIds]);

  const startDrag = useCallback((section, e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, origX = section.x, origY = section.y;
    const onMove = (ev) => updateSection(section.id, { x: Math.round(origX + (ev.clientX - startX)), y: Math.round(origY + (ev.clientY - startY)) });
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, [updateSection]);

  const startResize = useCallback((section, e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, origW = section.width, origH = section.height;
    const onMove = (ev) => updateSection(section.id, { width: Math.max(24, Math.round(origW + (ev.clientX - startX))), height: Math.max(16, Math.round(origH + (ev.clientY - startY))) });
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, [updateSection]);

  const toggleSelect = useCallback((id, e) => {
    e && e.stopPropagation();
    if (e && e.shiftKey) {
      setSelectedIds((prev = []) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setSelectedIds([id]);
    }
  }, [setSelectedIds]);

  /* Drawing new section (per-page) */
  const onPageMouseDown = (pageNumber, clientX, clientY) => {
    const pageEl = pageContainersRef.current[pageNumber];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    drawingRef.current = { active: true, page: pageNumber, startX: clientX - rect.left, startY: clientY - rect.top };
  };

  const onPageMouseMove = (pageNumber, clientX, clientY) => {
    if (!drawingRef.current.active || drawingRef.current.page !== pageNumber) return;
    const pageEl = pageContainersRef.current[pageNumber];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const curX = clientX - rect.left, curY = clientY - rect.top;
    const { startX, startY } = drawingRef.current;
    const x = Math.min(startX, curX), y = Math.min(startY, curY), width = Math.abs(curX - startX), height = Math.abs(curY - startY);
    setSections((prev = []) => {
      const others = prev.filter((s) => !s.__isDraft);
      const draft = { id: "__draft__" + pageNumber, __isDraft: true, page: pageNumber, x: Math.round(Math.max(0, x)), y: Math.round(Math.max(0, y)), width: Math.round(width), height: Math.round(height) };
      return [...others, draft];
    });
  };

  const onPageMouseUp = (pageNumber) => {
    if (!drawingRef.current.active) return;
    const draftId = "__draft__" + pageNumber;
    const current = (sections || []).find((s) => s.id === draftId);
    drawingRef.current.active = false;
    drawingRef.current.page = null;
    if (current && current.width > 8 && current.height > 8) {
      const real = { ...current, id: `sec_${Date.now()}`, __isDraft: false };
      setSections((prev = []) => [...prev.filter((s) => s.id !== draftId), real]);
      setSelectedIds([real.id]);
    } else {
      setSections((prev = []) => prev.filter((s) => s.id !== draftId));
    }
  };

  /* Keyboard handlers */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedIds || []).length) {
        setSections((prev = []) => prev.filter((s) => !(selectedIds || []).includes(s.id)));
        setSelectedIds([]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && (selectedIds || []).length) {
        setSections((prev = []) => {
          const toDup = prev.filter((s) => (selectedIds || []).includes(s.id));
          const dup = toDup.map((s) => ({ ...s, id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, x: s.x + 12, y: s.y + 12 }));
          return [...prev, ...dup];
        });
        return;
      }
      if (e.key.startsWith("Arrow") && (selectedIds || []).length) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        setSections((prev = []) => prev.map((s) => (selectedIds || []).includes(s.id) ? { ...s, x: s.x + (e.key === "ArrowRight" ? delta : e.key === "ArrowLeft" ? -delta : 0), y: s.y + (e.key === "ArrowDown" ? delta : e.key === "ArrowUp" ? -delta : 0) } : s));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, setSections, setSelectedIds]);

  /* Keep viewerDimsRef in sync */
  useEffect(() => {
    if (!viewerDimsRef || !viewerDimsRef.current) return;
    (pageCanvases || []).forEach((p) => {
      viewerDimsRef.current[p.pageNumber] = {
        renderedWidth: p.width,
        renderedHeight: p.height,
        pageDims: { width: p.width, height: p.height },
      };
    });
  }, [pageCanvases, viewerDimsRef]);

  /* Render */
  return (
    <div className="w-full h-full flex overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-gray-50" style={{ position: "relative" }}>
        {loading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60">
            <div className="text-gray-700">Loading PDF…</div>
          </div>
        )}

        {!hasSource && (
          <div className="w-full h-96 flex items-center justify-center text-gray-500">Upload a PDF to begin</div>
        )}

        {(pageCanvases || []).map((p) => {
          const pageNum = p.pageNumber;
          return (
            <div
              key={pageNum}
              ref={(el) => { pageContainersRef.current[pageNum] = el; }}
              onMouseDown={(ev) => { if (ev.button !== 0) return; onPageMouseDown(pageNum, ev.clientX, ev.clientY); }}
              onMouseMove={(ev) => { if (!drawingRef.current.active) return; onPageMouseMove(pageNum, ev.clientX, ev.clientY); }}
              onMouseUp={() => onPageMouseUp(pageNum)}
              className="relative mx-auto"
              style={{ width: p.width }}
            >
              <div className="select-none" ref={(div) => { if (!div) return; const first = div.firstChild; if (p.canvas && first !== p.canvas) { div.innerHTML = ""; div.appendChild(p.canvas); } }} />

              {(sections || []).filter((s) => s && s.page === pageNum).map((s) => {
                const isSelected = (selectedIds || []).includes(s.id);
                return (
                  <div
                    key={s.id}
                    onMouseDown={(ev) => toggleSelect(s.id, ev)}
                    className={clsx("absolute", "box-border", "shadow-sm", "overflow-hidden")}
                    style={{
                      left: s.x,
                      top: s.y,
                      width: s.width,
                      height: s.height,
                      border: `2px solid ${isSelected ? "#0ea5e9" : "#fb7185"}`,
                      background: isSelected ? "rgba(14,165,233,0.06)" : "rgba(251,113,133,0.04)",
                      borderRadius: 6,
                    }}
                  >
                    <div onMouseDown={(ev) => startDrag(s, ev)} style={{ width: "100%", height: "100%", cursor: "move" }} />

                    <div
                      onMouseDown={(ev) => { ev.stopPropagation(); startResize(s, ev); }}
                      style={{
                        position: "absolute",
                        right: -8,
                        bottom: -8,
                        width: 16,
                        height: 16,
                        background: isSelected ? "#0369a1" : "#60a5fa",
                        borderRadius: 4,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        cursor: "nwse-resize",
                      }}
                    />
                    <button onClick={(ev) => { ev.stopPropagation(); removeSection(s.id); }} title="Remove section" style={{ position: "absolute", right: 4, top: 4, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>×</button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <aside style={{ width: 420 }} className="p-6 bg-white border-l">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Sections</h3>
          {(sections || []).length === 0 && <div className="text-sm text-gray-500">No sections selected</div>}
          <div className="space-y-2 max-h-[40vh] overflow-auto mt-3">
            {(sections || []).map((s) => (
              <div key={s.id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="text-sm font-mono">{s.id}</div>
                  <div className="text-xs text-gray-500">Page {s.page} • {s.width}×{s.height}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => removeSection(s.id)} className="px-2 py-1 border rounded text-sm">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Fields</h3>
          {(fields || []).length === 0 && <div className="text-sm text-gray-500">No detected fields</div>}
          <div className="space-y-2 max-h-[30vh] overflow-auto mt-3">
            {(fields || []).map((f) => (
              <div key={f.id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="text-sm">{f.name}</div>
                  <div className="text-xs text-gray-500">{f.type} • Page {f.page}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <strong>Notes</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>Draw sections: click-drag on any page to create a selection.</li>
            <li>Multi-select: Shift + Click to add/remove from selection.</li>
            <li>Keyboard: Del to delete, Ctrl/Cmd+D to duplicate, arrows to nudge.</li>
            <li>Use viewerDimsRef to convert pixel coords to PDF points server-side.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
