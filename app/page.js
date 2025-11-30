"use client"
import dynamic from 'next/dynamic'
import React, { useRef, useState, useEffect } from 'react'
const PdfViewer = dynamic(() => import('../components/PdfViewer'), { ssr: false })
import RightPanel from '../components/RightPanel'
import { convertToPdfPoints } from '../utils/coords'

export default function Page() {
  const [pdfUrl, setPdfUrl] = useState([])
  const [sections, setSections] = useState(() => { try { return JSON.parse(localStorage.getItem('docsy_sections')||'[]') } catch(e){return[]} })
  const [fields, setFields] = useState([])
  const viewerDimsRef = useRef({})

  useEffect(()=>{ localStorage.setItem('docsy_sections', JSON.stringify(sections)) },[sections])

  const handleUpload = (file) => setPdfUrl(URL.createObjectURL(file))

  const runDetection = async () => {
    if (!pdfUrl) return alert('Upload a PDF first')
    const pdfRegions = sections.map(s => {
      const dims = viewerDimsRef.current[s.page] || { renderedWidth: 800, renderedHeight: 1000, pageDims: { width: 612, height: 792 } }
      const rendered = { width: dims.renderedWidth, height: dims.renderedHeight }
      return convertToPdfPoints(s, dims.pageDims, rendered)
    })

    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfRegions })
    })
    const body = await res.json()
    setFields(body.fields)
  }

  return (
    <main className="min-h-screen p-6 grid grid-cols-12 gap-6">
      <div className="col-span-8">
        <PdfViewer
          pdfUrl={pdfUrl}
          onUpload={handleUpload}
          sections={sections}
          setSections={setSections}
          fields={fields}
          setFields={setFields}
          viewerDimsRef={viewerDimsRef}
        />
      </div>
      <div className="col-span-4">
        <RightPanel
          sections={sections}
          setSections={setSections}
          fields={fields}
          setFields={setFields}
          onDetect={runDetection}
        />
      </div>
    </main>
  )
}
