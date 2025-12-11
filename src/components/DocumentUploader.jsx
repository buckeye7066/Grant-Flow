import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, X, Loader2, Sparkles, Check, AlertCircle, Clipboard, File } from 'lucide-react';

export default function DocumentUploader({ organizationId, onDataExtracted, onDocumentUploaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain'
  ];

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      if (!acceptedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx?|png|jpe?g|gif|webp|txt)$/i)) {
        setError(`File type not supported: ${file.name}`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File too large: ${file.name} (max 10MB)`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      name: f.name,
      type: f.type,
      size: f.size
    }))]);
    setError(null);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0 && !pasteText) return;

    setProcessing(true);
    setError(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);

      files.forEach((f) => {
        formData.append('file', f.file);
      });

      if (pasteText.trim()) {
        formData.append('pastedText', pasteText);
      }

      const response = await fetch('/api/documents/upload-and-parse', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process documents');
      }

      const result = await response.json();

      if (result.extractedFields) {
        setExtractedData(result.extractedFields);
      }

      if (result.documents) {
        result.documents.forEach(doc => {
          onDocumentUploaded?.(doc);
        });
      }

      setFiles(prev => prev.map(f => ({ ...f, status: 'complete' })));

    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process documents');
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    } finally {
      setProcessing(false);
    }
  };

  const applyExtractedData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
      setExtractedData(null);
      setFiles([]);
      setPasteText('');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
    if (type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type?.includes('word') || type?.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const hasContent = files.length > 0 || pasteText.trim();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
        <div className="flex items-center gap-3 text-white">
          <Upload className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-lg">Document Uploader</h3>
            <p className="text-emerald-100 text-sm">Upload documents to auto-fill profile fields</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-emerald-500' : 'text-slate-400'}`} />
          <p className="text-slate-700 font-medium">
            {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            PDF, Word, Images, Text (max 10MB each)
          </p>
        </div>

        <div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPasteBox(!showPasteBox); }}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
          >
            <Clipboard className="w-4 h-4" />
            {showPasteBox ? 'Hide paste box' : 'Or paste text directly'}
          </button>

          {showPasteBox && (
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste text from emails, websites, or documents..."
              rows={4}
              className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          )}
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Files to process:</h4>
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                {getFileIcon(f.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(f.size)}</p>
                </div>
                {f.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {f.status === 'complete' && <Check className="w-5 h-5 text-green-500" />}
                {f.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              </div>
            ))}
          </div>
        )}

        {hasContent && !extractedData && (
          <button
            onClick={processFiles}
            disabled={processing}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Extract Data with AI
              </>
            )}
          </button>
        )}

        {extractedData && (
          <div className="border border-emerald-200 rounded-lg overflow-hidden">
            <div className="bg-emerald-50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">Extracted Data</span>
              </div>
              <span className="text-sm text-emerald-600">
                {Object.keys(extractedData).length} fields found
              </span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              {Object.entries(extractedData).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <span className="font-medium text-slate-600 min-w-[120px]">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-slate-800 truncate">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t flex gap-2">
              <button
                onClick={applyExtractedData}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply to Profile
              </button>
              <button
                onClick={() => setExtractedData(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}