import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  FileText, 
  Image, 
  Download, 
  Trash2, 
  Edit3, 
  Calendar, 
  Stethoscope, 
  Building2,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Document, getDocumentUrl, deleteDocument, formatFileSize } from '../../lib/documents';
import toast from 'react-hot-toast';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onRefresh: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  loading, 
  onRefresh 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Report' | 'Prescription'>('All');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter documents based on search and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'All' || doc.document_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleDownload = async (document: Document) => {
    try {
      const { data: url, error } = await getDocumentUrl(document.file_path);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (url) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = document.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Download started');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleView = async (document: Document) => {
    try {
      const { data: url, error } = await getDocumentUrl(document.file_path);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error: any) {
      console.error('View error:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDelete = async (document: Document) => {
    setSelectedDocument(document);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDocument) return;
    
    setDeletingId(selectedDocument.id);
    
    try {
      const { error } = await deleteDocument(selectedDocument.id, selectedDocument.file_path);
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success('Document deleted successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
      setSelectedDocument(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 md:w-6 md:h-6 text-red-500" />;
    }
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />;
  };

  const getDocumentTypeColor = (type: string) => {
    return type === 'Report' 
      ? 'bg-blue-900/20 text-blue-400 border-blue-800' 
      : 'bg-green-900/20 text-green-400 border-green-800';
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-3 text-slate-400">Loading documents...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 md:p-6 bg-slate-800 border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-3 sm:mb-0">
            My Documents ({documents.length})
          </h2>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-full sm:w-48 md:w-64 text-sm"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 md:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            >
              <option value="All">All Types</option>
              <option value="Report">Reports</option>
              <option value="Prescription">Prescriptions</option>
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <FileText className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-slate-300 mb-2">
              {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your search'}
            </h3>
            <p className="text-sm md:text-base text-slate-500">
              {documents.length === 0 
                ? 'Upload your first medical document to get started'
                : 'Try adjusting your search terms or filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1">
                  {getFileIcon(document.file_type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm md:text-base truncate pr-2">
                        {document.document_name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDocumentTypeColor(document.document_type)} mt-1 sm:mt-0 flex-shrink-0`}>
                        {document.document_type}
                      </span>
                    </div>
                    
                    {/* Mobile: Stack info vertically, Desktop: Grid layout */}
                    <div className="space-y-1 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-2 text-xs md:text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="truncate">
                          <span className="md:hidden">Uploaded: </span>
                          {format(parseISO(document.upload_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      {document.doctor_name && (
                        <div className="flex items-center space-x-1">
                          <Stethoscope className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 text-cyan-400" />
                          <span className="truncate">
                            <span className="md:hidden">Dr. </span>
                            {document.doctor_name}
                          </span>
                        </div>
                      )}
                      
                      {document.report_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">
                            <span className="md:hidden">Report: </span>
                            {format(parseISO(document.report_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-slate-500 text-xs">
                        {formatFileSize(document.file_size)}
                      </div>
                    </div>
                    
                    {document.report_center && (
                      <div className="flex items-center space-x-1 mt-1 text-xs md:text-sm text-slate-400">
                        <Building2 className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="truncate">{document.report_center}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-end space-x-1 md:space-x-2 mt-3 md:mt-0 md:ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(document)}
                    className="text-cyan-400 hover:text-cyan-300 p-1.5 md:p-2"
                    title="View document"
                  >
                    <Eye size={14} className="md:w-4 md:h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(document)}
                    className="text-green-400 hover:text-green-300 p-1.5 md:p-2"
                    title="Download document"
                  >
                    <Download size={14} className="md:w-4 md:h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(document)}
                    className="text-red-400 hover:text-red-300 p-1.5 md:p-2"
                    title="Delete document"
                  >
                    <Trash2 size={14} className="md:w-4 md:h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Document"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete "{selectedDocument?.document_name}"? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deletingId === selectedDocument?.id}
            >
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};