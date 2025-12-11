/**
 * BASE44 EXPORT FUNCTION
 * 
 * Add this as a new function in Base44 called "exportAllData"
 * Then call it from your browser console or create a button to trigger it.
 * 
 * This will export all your data as a JSON file you can download.
 */

import sdk from '@base44/sdk';
sdk.auth.setAuthHeader();

export default async function handler(input) {
  console.log('[exportAllData] Starting full export...');
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    entities: {}
  };
  
  // List of entities to export - add any others you have
  const entitiesToExport = [
    'Organization',
    'FundingOpportunity', 
    'PipelineItem',
    'Match',
    'GrantSource',
    'Application',
    'Task',
    'Note',
    'Document',
    'Contact',
    'Funder',
    'Category',
    'Tag'
  ];
  
  for (const entityName of entitiesToExport) {
    try {
      console.log(`[exportAllData] Exporting ${entityName}...`);
      
      // Try to access the entity
      const entity = sdk.entities[entityName];
      if (!entity) {
        console.log(`[exportAllData] Entity ${entityName} not found, skipping`);
        continue;
      }
      
      // Fetch all records
      const records = await entity.list('-created_date', 1000);
      
      if (records && records.length > 0) {
        exportData.entities[entityName] = records;
        console.log(`[exportAllData] Exported ${records.length} ${entityName} records`);
      } else {
        console.log(`[exportAllData] No records found for ${entityName}`);
      }
    } catch (err) {
      console.log(`[exportAllData] Could not export ${entityName}: ${err.message}`);
      // Continue with other entities
    }
  }
  
  // Summary
  const summary = {};
  for (const [name, records] of Object.entries(exportData.entities)) {
    summary[name] = records.length;
  }
  
  console.log('[exportAllData] Export complete!', summary);
  
  return {
    ok: true,
    summary,
    data: exportData
  };
}
