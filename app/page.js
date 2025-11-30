"use client";   // <-- REQUIRED FIX

import React, { useState } from "react";
import PdfViewer from "../components/PdfViewer";
import RightPanel from "../components/RightPanel";

export default function HomePage() {
  const [pdfData, setPdfData] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setPdfData(new Uint8Array(evt.target.result));
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex h-screen">
      {/* LEFT: PDF Viewer */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-auto">

        {/* Upload Button */}
        <div className="p-4 border-b bg-white flex items-center justify-center">
          <label className="px-4 py-2 rounded-lg bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
            Upload PDF
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto">
          <PdfViewer
            pdfData={pdfData}
            sections={sections}
            setSections={setSections}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        </div>
      </div>

      {/* RIGHT: Panels */}
      <RightPanel
        sections={sections}
        selectedIds={selectedIds}
      />
    </div>
  );
}
