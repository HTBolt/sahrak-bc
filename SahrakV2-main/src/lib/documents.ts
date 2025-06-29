import { getCurrentUser } from './customAuth';
import { supabase } from './supabase';

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  document_type: 'Report' | 'Prescription';
  document_name: string;
  doctor_name?: string;
  report_date?: string;
  report_center?: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUpload {
  file: File;
  document_type: 'Report' | 'Prescription';
  document_name: string;
  doctor_name?: string;
  report_date?: string;
  report_center?: string;
}

// Upload document file and create database record
export const uploadDocument = async (uploadData: DocumentUpload): Promise<{ data: Document | null; error: any }> => {
  try {
    const { file, ...metadata } = uploadData;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return {
        data: null,
        error: { message: 'Only PDF and image files (JPEG, PNG) are allowed' }
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        data: null,
        error: { message: 'File size must be less than 10MB' }
      };
    }

    // Get current user
    const user = getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return { data: null, error: uploadError };
    }

    // Create database record
    const documentData = {
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      document_type: metadata.document_type,
      document_name: metadata.document_name,
      doctor_name: metadata.doctor_name || null,
      report_date: metadata.report_date || null,
      report_center: metadata.report_center || null,
    };

    const { data, error: dbError } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([filePath]);
      return { data: null, error: dbError };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get user's documents
export const getUserDocuments = async (): Promise<{ data: Document[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .order('upload_date', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get document download URL
export const getDocumentUrl = async (filePath: string): Promise<{ data: string | null; error: any }> => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      return { data: null, error };
    }

    return { data: data.signedUrl, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Delete document
export const deleteDocument = async (documentId: string, filePath: string): Promise<{ error: any }> => {
  try {
    // Delete from database first
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      return { error: dbError };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    return { error: storageError };
  } catch (error) {
    return { error };
  }
};

// Update document metadata
export const updateDocument = async (
  documentId: string, 
  updates: Partial<Pick<Document, 'document_name' | 'doctor_name' | 'report_date' | 'report_center' | 'document_type'>>
): Promise<{ data: Document | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file type icon
export const getFileTypeIcon = (fileType: string): string => {
  if (fileType === 'application/pdf') return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  return '📎';
};