/**
 * BASE44 EXPORT PAGE
 * 
 * Add this as a new page in Base44 called "DataExport"
 * Navigate to it and click the Export button to download all your data.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Import all your entity models here - adjust based on what you actually have
import { Organization } from '@/entities/Organization';
import { FundingOpportunity } from '@/entities/FundingOpportunity';
import { PipelineItem } from '@/entities/PipelineItem';
import { Match } from '@/entities/Match';
// Add any other entities you have:
// import { GrantSource } from '@/entities/GrantSource';
// import { Application } from '@/entities/Application';
// etc.

export default function DataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState({});

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setStatus('Exporting...');
    setResults({});

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      source: 'Base44',
      entities: {}
    };

    const exportResults = {};

    // Export each entity - add/remove based on your actual entities
    const entities = [
      { name: 'Organization', model: Organization },
      { name: 'FundingOpportunity', model: FundingOpportunity },
      { name: 'PipelineItem', model: PipelineItem },
      { name: 'Match', model: Match },
      // Add more entities here as needed:
      // { name: 'GrantSource', model: GrantSource },
      // { name: 'Application', model: Application },
    ];

    for (const { name, model } of entities) {
      try {
        setStatus(`Exporting ${name}...`);
        const records = await model.list('-created_date', 1000);
        
        if (records && records.length > 0) {
          exportData.entities[name] = records;
          exportResults[name] = { success: true, count: records.length };
        } else {
          exportResults[name] = { success: true, count: 0 };
        }
      } catch (err) {
        console.error(`Failed to export ${name}:`, err);
        exportResults[name] = { success: false, error: err.message };
      }
    }

    setResults(exportResults);

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `grantflow-export-${dateStr}.json`;

    // Download the file
    downloadJSON(exportData, filename);

    setStatus('Export complete!');
    setIsExporting(false);
  };

  const totalRecords = Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-6 h-6" />
              Export GrantFlow Data
            </CardTitle>
            <CardDescription>
              Download all your data as a JSON file for migration to the local app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {status}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export All Data
                </>
              )}
            </Button>

            {Object.keys(results).length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Export Results:</h3>
                <div className="bg-slate-100 rounded p-4 space-y-1">
                  {Object.entries(results).map(([name, result]) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium">{name}:</span>
                      <span>
                        {result.success 
                          ? `${result.count} records` 
                          : `Error - ${result.error}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Total: {totalRecords} records exported
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">Next Steps:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-800 mt-2 space-y-1">
                <li>Click "Export All Data" above</li>
                <li>Save the downloaded JSON file</li>
                <li>Place it in your local GrantFlow's <code className="bg-blue-100 px-1 rounded">data/</code> folder</li>
                <li>Run the import command in the local app</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
