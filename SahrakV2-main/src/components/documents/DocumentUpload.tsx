import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, FileText, Image, Calendar, User, Building2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { uploadDocument, DocumentUpload as DocumentUploadType } from '../../lib/documents';
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
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadForm>({
    defaultValues: {
      document_type: 'Report',
      document_name: '',
      doctor_name: '',
      report_date: '',
      report_center: ''
    }
  });

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];

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

  const handleFileSelect = (file: File) => {
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
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
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

      const { data: result, error } = await uploadDocument(uploadData);

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      toast.success('Document uploaded successfully!');
      
      // Reset form
      form.reset();
      setSelectedFile(null);
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
  );
};