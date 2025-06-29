import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, FileText, Image, Calendar, User, Building2, ChevronDown, Shield, Hash } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { uploadDocument, DocumentUpload as DocumentUploadType } from '../../lib/documents';
import { generateDocumentHash, storeDocumentOnBlockchain, getAccountBalance } from '../../lib/blockchain';
import { BlockchainStatus } from './BlockchainStatus';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  onUploadSuccess: () => void;
}

interface UploadForm {
  document_type: 'Report' | 'Prescription';
  document_name: string;
  doctor_name: string;
  report_date: string;
  report_center: string;
  store_on_blockchain: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadForm>({
    defaultValues: {
      document_type: 'Report',
      document_name: '',
      doctor_name: '',
      report_date: '',
      report_center: '',
      store_on_blockchain: false
    }
  });

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];

  // Check blockchain status when component mounts
  React.useEffect(() => {
    checkBlockchainStatus();
  }, []);

  const checkBlockchainStatus = async () => {
    try {
      const balance = await getAccountBalance();
      setAccountBalance(balance);
      setBlockchainEnabled(balance > 0.001); // Need at least 0.001 ALGO for transactions
    } catch (error) {
      console.error('Error checking blockchain status:', error);
      setBlockchainEnabled(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and image files (JPEG, PNG) are allowed');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill document name if empty
    if (!form.getValues('document_name')) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      form.setValue('document_name', nameWithoutExt);
    }

    // Generate file hash for blockchain storage
    try {
      const hash = await generateDocumentHash(file);
      setFileHash(hash);
      console.log('Generated file hash:', hash);
    } catch (error) {
      console.error('Error generating file hash:', error);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileHash(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: UploadForm) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    // Validate report date is not in the future
    if (data.report_date && data.report_date > today) {
      toast.error('Report date cannot be in the future');
      return;
    }

    setUploading(true);
    
    try {
      const uploadData: DocumentUploadType = {
        file: selectedFile,
        document_type: data.document_type,
        document_name: data.document_name,
        doctor_name: data.doctor_name || undefined,
        report_date: data.report_date || undefined,
        report_center: data.report_center || undefined,
      };

      // Upload document to storage first
      const { data: result, error } = await uploadDocument(uploadData);

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      let blockchainTxId = null;

      // Store on blockchain if requested and enabled
      if (data.store_on_blockchain && blockchainEnabled && fileHash && result) {
        try {
          toast.loading('Storing document hash on blockchain...', { id: 'blockchain' });
          
          const blockchainResult = await storeDocumentOnBlockchain(
            result.id,
            data.document_name,
            fileHash
          );

          if (blockchainResult.success) {
            blockchainTxId = blockchainResult.transactionId;
            toast.success('Document stored on blockchain!', { id: 'blockchain' });
          } else {
            toast.error('Failed to store on blockchain: ' + blockchainResult.error, { id: 'blockchain' });
          }
        } catch (blockchainError: any) {
          console.error('Blockchain storage error:', blockchainError);
          toast.error('Blockchain storage failed: ' + blockchainError.message, { id: 'blockchain' });
        }
      }

      toast.success('Document uploaded successfully!');
      
      // Reset form
      form.reset();
      setSelectedFile(null);
      setFileHash(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onUploadSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Blockchain Status */}
      <BlockchainStatus />
      
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-6">Upload New Document</h2>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Select File *
            </label>
            
            {!selectedFile ? (
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragActive 
                    ? 'border-cyan-400 bg-cyan-900/20' 
                    : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                  }
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 mb-2">
                  Drop your file here, or <span className="text-cyan-400">browse</span>
                </p>
                <p className="text-sm text-slate-500">
                  Supports PDF, JPEG, PNG files up to 10MB
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-lg">
                {getFileIcon(selectedFile)}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                  {fileHash && (
                    <div className="flex items-center space-x-2 mt-1">
                      <Hash className="w-3 h-3 text-green-400" />
                      <p className="text-xs text-green-400 font-mono">
                        Hash: {fileHash.substring(0, 16)}...
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-400 hover:text-red-300"
                >
                  <X size={16} />
                </Button>
              </div>
            )}
          </div>

          {/* Blockchain Storage Option */}
          {selectedFile && fileHash && (
            <Card className="p-4 bg-slate-700/30 border-slate-600">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">Blockchain Storage</h3>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...form.register('store_on_blockchain')}
                        disabled={!blockchainEnabled}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-300">
                        Store hash on blockchain
                      </span>
                    </label>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-2">
                    Store a cryptographic hash of your document on the Algorand blockchain 
                    for immutable proof of existence and integrity verification.
                  </p>
                  
                  {!blockchainEnabled && (
                    <div className="flex items-center space-x-2 text-xs text-orange-400">
                      <Shield className="w-3 h-3" />
                      <span>
                        {accountBalance === 0 
                          ? 'Account needs funding to enable blockchain features'
                          : 'Insufficient balance for blockchain transactions'
                        }
                      </span>
                    </div>
                  )}
                  
                  {blockchainEnabled && (
                    <div className="flex items-center space-x-2 text-xs text-green-400">
                      <Shield className="w-3 h-3" />
                      <span>Blockchain features ready (Balance: {accountBalance?.toFixed(6)} ALGO)</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Document Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Document Type *
            </label>
            <div className="relative">
              <select
                {...form.register('document_type', { required: 'Document type is required' })}
                className="
                  w-full appearance-none bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 pr-10
                  text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                  cursor-pointer
                "
              >
                <option value="Report">Medical Report</option>
                <option value="Prescription">Prescription</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
            {form.formState.errors.document_type && (
              <p className="mt-1 text-sm text-red-400">{form.formState.errors.document_type.message}</p>
            )}
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Document Name *"
              placeholder="Enter document name"
              {...form.register('document_name', { required: 'Document name is required' })}
              error={form.formState.errors.document_name?.message}
            />
            
            <Input
              label="Doctor Name"
              placeholder="Enter doctor's name"
              icon={<User size={16} className="text-gray-400" />}
              {...form.register('doctor_name')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Report Date"
              type="date"
              max={today}
              icon={<Calendar size={16} className="text-gray-400" />}
              {...form.register('report_date', {
                validate: (value) => {
                  if (value && value > today) {
                    return 'Report date cannot be in the future';
                  }
                  return true;
                }
              })}
              error={form.formState.errors.report_date?.message}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Center
              </label>
              <textarea
                placeholder="Enter hospital/clinic name and address"
                {...form.register('report_center')}
                className="
                  block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 
                  focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400
                  dark:focus:border-primary-400 dark:focus:ring-primary-400
                  resize-none
                "
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={uploading}
              disabled={!selectedFile || uploading}
              className="px-8"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};