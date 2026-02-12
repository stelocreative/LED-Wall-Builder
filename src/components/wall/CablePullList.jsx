import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cable, Zap, ArrowRight } from 'lucide-react';

export default function CablePullList({ layout, dataRuns, powerPlan, cabinets }) {
  // Calculate data jumpers
  const dataJumpers = dataRuns.reduce((acc, run) => {
    return acc + Math.max(0, (run.path?.length || 0) - 1);
  }, 0);
  
  const dataHomeRuns = dataRuns.length;

  // Calculate power jumpers (assumes daisy chain)
  const powerJumpers = powerPlan.reduce((acc, circuit) => {
    return acc + Math.max(0, (circuit.cabinet_ids?.length || 0) - 1);
  }, 0);

  const powerHomeRuns = powerPlan.length;

  // Estimate cable lengths (rough approximation)
  const estimateDataJumperLength = '5ft'; // typical panel-to-panel
  const estimateDataHomeRunLength = '50-100ft'; // depends on setup
  const estimatePowerJumperLength = '5ft';
  const estimatePowerHomeRunLength = '25-50ft';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Cable className="w-5 h-5 text-cyan-400" />
          Cable Pull List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Cables */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cable className="w-4 h-4 text-blue-400" />
            <h4 className="font-medium text-white">Data Cables</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
              <div>
                <p className="text-white font-medium">Data Jumpers (RJ45)</p>
                <p className="text-xs text-slate-400">Panel-to-panel connections</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {dataJumpers} × {estimateDataJumperLength}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
              <div>
                <p className="text-white font-medium">Data Home Runs</p>
                <p className="text-xs text-slate-400">Processor to wall</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {dataHomeRuns} × {estimateDataHomeRunLength}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Power Cables */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h4 className="font-medium text-white">Power Cables</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
              <div>
                <p className="text-white font-medium">Power Jumpers</p>
                <p className="text-xs text-slate-400">Panel-to-panel power</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  {powerJumpers} × {estimatePowerJumperLength}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
              <div>
                <p className="text-white font-medium">Power Feeds/Circuits</p>
                <p className="text-xs text-slate-400">Distro to wall</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  {powerHomeRuns} × {estimatePowerHomeRunLength}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Total Summary */}
        <div className="p-3 bg-slate-700/50 rounded">
          <h4 className="font-medium text-white mb-2 text-sm">Quick Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-400">Total Data Cables</p>
              <p className="text-white font-bold">{dataJumpers + dataHomeRuns}</p>
            </div>
            <div>
              <p className="text-slate-400">Total Power Cables</p>
              <p className="text-white font-bold">{powerJumpers + powerHomeRuns}</p>
            </div>
          </div>
        </div>

        <div className="p-2 bg-cyan-900/20 rounded border border-cyan-700/30 text-xs text-cyan-300">
          <ArrowRight className="w-3 h-3 inline mr-1" />
          Lengths are estimates. Measure actual runs based on your setup.
        </div>
      </CardContent>
    </Card>
  );
}