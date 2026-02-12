import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag, Download } from 'lucide-react';

export default function LabelGenerator({ layout, dataRuns, powerPlan }) {
  const printRef = useRef();

  const handlePrintLabels = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cabinet Labels</title>
          <style>
            @page { size: letter; margin: 0.5in; }
            body { font-family: Arial, sans-serif; }
            .label-sheet { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 0.25in; 
              page-break-after: always;
            }
            .label { 
              border: 2px solid #000; 
              padding: 12px; 
              text-align: center;
              height: 1.5in;
              display: flex;
              flex-direction: column;
              justify-content: center;
              page-break-inside: avoid;
            }
            .label-title { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
            .label-subtitle { font-size: 14px; color: #666; }
            .section-title { 
              font-size: 18px; 
              font-weight: bold; 
              margin: 20px 0 10px 0;
              border-bottom: 2px solid #000;
              padding-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <h1>LED Wall Cabinet Labels</h1>
          
          <div class="section-title">Cabinet IDs</div>
          <div class="label-sheet">
            ${layout.map(item => `
              <div class="label">
                <div class="label-title">${item.label}</div>
                <div class="label-subtitle">Cabinet ${item.label}</div>
              </div>
            `).join('')}
          </div>

          <div class="section-title">Data Run Labels</div>
          <div class="label-sheet">
            ${dataRuns.map((run, idx) => `
              <div class="label">
                <div class="label-title">DATA ${idx + 1}</div>
                <div class="label-subtitle">${run.processor_port || `Port ${idx + 1}`}</div>
              </div>
            `).join('')}
          </div>

          <div class="section-title">Power Circuit Labels</div>
          <div class="label-sheet">
            ${powerPlan.map((circuit, idx) => `
              <div class="label">
                <div class="label-title">${circuit.label}</div>
                <div class="label-subtitle">Power Circuit ${idx + 1}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Tag className="w-5 h-5 text-pink-400" />
          Label Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 bg-slate-700/30 rounded text-sm text-slate-300">
          <p className="mb-2">Generate printable labels for:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>{layout.length} cabinet IDs ({layout.map(l => l.label).join(', ')})</li>
            <li>{dataRuns.length} data run labels</li>
            <li>{powerPlan.length} power circuit labels</li>
          </ul>
        </div>

        <Button 
          onClick={handlePrintLabels} 
          className="w-full bg-pink-600 hover:bg-pink-700"
          disabled={layout.length === 0 && dataRuns.length === 0 && powerPlan.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Print Label Sheet
        </Button>
      </CardContent>
    </Card>
  );
}