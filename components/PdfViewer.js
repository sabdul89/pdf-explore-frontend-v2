'use client'
import React, { useRef, useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

const DEFAULT_PAGE_DIMS = { width: 612, height: 792 }

function SectionBox({ box, onChange, onSelect, isSelected }) {
  const startRef = useRef(null);

  function startDrag(e, type) {
    e.stopPropagation();
    e.preventDefault();
    startRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...box }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  }

  function move(e) {
    if (!startRef.current) return;
    const { type, startX, startY, orig } = startRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let updated = { ...orig };

    if (type === 'move') {
      updated.x = orig.x + dx;
      updated.y = orig.y + dy;
    } else if (type === 'right') {
      updated.width = Math.max(20, orig.width + dx);
    } else if (type === 'bottom') {
      updated.height = Math.max(20, orig.height + dy);
    } else if (type === 'corner') {
      updated.width = Math.max(20, orig.width + dx);
      updated.height = Math.max(20, orig.height + dy);
    }
    onChange(updated);
  }

  function stop() {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', stop);
    startRef.current = null;
  }

  return (
    <div
      onMouseDown={(e) => { onSelect(e); startDrag(e, 'move'); }}
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        boxSizing: 'border-box',
        border: `2px solid ${isSelected ? '#0ea5e9' : '#60a5fa'}`,
        background: 'rgba(14,165,233,0.06)',
        borderRadius: 6,
        cursor: 'move',
      }}
    >
      <div style={{ position: 'absolute', right: -6, top: '50%', width: 12, height: 12, cursor: 'ew-resize', background: isSelected ? '#0284c7' : '#60a5fa' }} onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'right'); }} />
      <div style={{ position: 'absolute', bottom: -6, left: '50%', width: 12, height: 12, cursor: 'ns-resize', background: isSelected ? '#0284c7' : '#60a5fa' }} onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'bottom'); }} />
      <div style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, cursor: 'nwse-resize', background: isSelected ? '#0369a1' : '#60a5fa' }} onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'corner'); }} />
    </div>
  )
}

export default function PdfViewer({ pdfUrl, onUpload, sections, setSections, fields, setFields, viewerDimsRef }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const viewerRef = useRef(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [start, setStart] = useState(null)
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 })
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setSections(prev => prev.filter(s => !selectedIds.includes(s.id)))
        setSelectedIds([])
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        setSections(prev => {
          const dup = prev.filter(s => selectedIds.includes(s.id)).map(s => ({ ...s, id: `sec_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, x: s.x + 10, y: s.y + 10 }))
          return [...prev, ...dup]
        })
      }
      if (e.key.startsWith('Arrow')) {
        const delta = e.shiftKey ? 10 : 1
        setSections(prev => prev.map(s => selectedIds.includes(s.id) ? ({ ...s, x: s.x + (e.key==='ArrowRight'?delta:e.key==='ArrowLeft'?-delta:0), y: s.y + (e.key==='ArrowDown'?delta:e.key==='ArrowUp'?-delta:0) }) : s))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, setSections])

  function onFileChange(e) { if (e.target.files[0]) onUpload(e.target.files[0]) }

  function startSelect(e) {
    if (!pdfUrl) return;
    setIsSelecting(true);
    const rect = viewerRef.current.getBoundingClientRect();
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function endSelect(e) {
    if (!isSelecting || !start) return;
    const rect = viewerRef.current.getBoundingClientRect();
    const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const newSec = { id: `sec_${Date.now()}`, page: pageNumber, x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
    setSections(prev => [...prev, newSec]);
    setStart(null); setIsSelecting(false);
  }

  function onPageRenderSuccess(canvas) {
    const renderedWidth = canvas.width || canvas.clientWidth || viewerRef.current.clientWidth
    const renderedHeight = canvas.height || canvas.clientHeight || viewerRef.current.clientHeight
    setRenderedSize({ width: renderedWidth, height: renderedHeight })
    viewerDimsRef.current[pageNumber] = { renderedWidth, renderedHeight, pageDims: DEFAULT_PAGE_DIMS }
  }

  function updateSection(updated) {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  function onSelectBox(e, id) {
    if (e.shiftKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setSelectedIds([id])
    }
  }

  return (
    <div className="h-full bg-white rounded-xl shadow p-3 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <input type="file" accept="application/pdf" onChange={onFileChange} />
        <button onClick={() => setIsSelecting(s => !s)} className={`px-3 py-1 rounded ${isSelecting ? 'bg-blue-600 text-white' : ''}`}>{isSelecting ? 'Selecting...' : 'Select Sections'}</button>
        <div className="ml-auto">Page: <strong>{pageNumber}</strong> / {numPages || '–'}</div>
      </div>

  <div ref={viewerRef} onMouseDown={startSelect} onMouseUp={endSelect} className="relative flex-1 overflow-auto border rounded">
    {!pdfUrl && <div className="h-96 flex items-center justify-center text-gray-400">Upload a PDF to preview</div>}

    {pdfUrl && (
      <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={pageNumber} width={900} onRenderSuccess={onPageRenderSuccess} />
      </Document>
    )}

    {sections.filter(s => s.page === pageNumber).map(s => (
      <SectionBox key={s.id} box={s} onChange={updateSection} onSelect={(e) => onSelectBox(e, s.id)} isSelected={selectedIds.includes(s.id)} />
    ))}

    {fields.filter(f => f.page === pageNumber).map(f => {
      const dims = viewerDimsRef.current[pageNumber] || { renderedWidth: renderedSize.width || 800, renderedHeight: renderedSize.height || 1000, pageDims: DEFAULT_PAGE_DIMS }
      const scaleX = dims.renderedWidth / dims.pageDims.width
      const scaleY = dims.renderedHeight / dims.pageDims.height
      const left = Math.round(f.x * scaleX)
      const top = Math.round(f.y * scaleY)
      const width = Math.round(f.width * scaleX)
      const height = Math.round(f.height * scaleY)
      return <div key={f.id} className="absolute border rounded bg-white/90 p-1 text-sm" style={{ left, top, width, height }}>{f.name}</div>
    })}
  </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Prev</button>
        <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} className="px-3 py-1 border rounded">Next</button>
      </div>
    </div>
  )
}
