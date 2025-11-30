'use client'
import React from 'react'

export default function RightPanel({ sections, setSections, fields, setFields, onDetect }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-semibold mb-2">Sections</h3>
        <div className="space-y-2 max-h-56 overflow-auto">
          {sections.map(s => (
            <div key={s.id} className="flex justify-between items-center p-2 border rounded">
              <div>
                <div className="text-sm font-mono">{s.id}</div>
                <div className="text-xs text-gray-500">Page {s.page} • {Math.round(s.width)}×{Math.round(s.height)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSections(sections.filter(x => x.id !== s.id))} className="text-sm px-2 py-1 border rounded">Remove</button>
              </div>
            </div>
          ))}
          {!sections.length && <div className="text-sm text-gray-500">No sections selected</div>}
        </div>
      </div>

      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-semibold mb-2">Fields</h3>
        <div className="space-y-2 max-h-56 overflow-auto">
          {fields.map(f => (
            <div key={f.id} className="p-2 border rounded flex justify-between items-center">
              <div>
                <div className="text-sm">{f.name}</div>
                <div className="text-xs text-gray-500">{f.type} • Page {f.page}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFields(fields.filter(x => x.id !== f.id))} className="px-2 py-1 border rounded text-sm">Remove</button>
              </div>
            </div>
          ))}
          {!fields.length && <div className="text-sm text-gray-500">No detected fields</div>}
        </div>

        <div className="mt-4">
          <button onClick={onDetect} className="w-full px-4 py-2 bg-blue-600 text-white rounded">Run Field Detection</button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-xl shadow text-sm text-gray-600">
        <strong>Notes</strong>
        <ul className="list-disc ml-5 mt-2">
          <li>Detection is mocked by the API route — swap with your ML service.</li>
          <li>Converted PDF coordinates are sent to the API at /api/detect.</li>
          <li>Persist sections server-side for multi-user/collab flows.</li>
        </ul>
      </div>
    </div>
  )
}
