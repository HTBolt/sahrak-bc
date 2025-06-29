import React, { useState, useEffect } from 'react';
import { FileText, Upload, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { DocumentList } from '../components/documents/DocumentList';
import { getUserDocuments, Document } from '../lib/documents';
import toast from 'react-hot-toast';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = async () => {
    try {
      const { data, error } = await getUserDocuments();
      
      if (error) {
        throw new Error(error.message);
      }
      
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadDocuments();
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">Medical Documents</h1>
          <p className="text-slate-400">
            Upload and manage your medical reports, prescriptions, and other health documents
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-300"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          
          <Button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center space-x-2"
          >
            <Upload size={16} />
            <span>{showUpload ? 'Cancel Upload' : 'Upload Document'}</span>
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <DocumentUpload onUploadSuccess={handleUploadSuccess} />
      )}

      {/* Documents List */}
      <DocumentList 
        documents={documents}
        loading={loading}
        onRefresh={loadDocuments}
      />

      {/* Quick Stats */}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {documents.filter(d => d.document_type === 'Report').length}
                </p>
                <p className="text-sm text-slate-400">Reports</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {documents.filter(d => d.document_type === 'Prescription').length}
                </p>
                <p className="text-sm text-slate-400">Prescriptions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Upload className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{documents.length}</p>
                <p className="text-sm text-slate-400">Total Documents</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;