import apiClient from './client';

export const documentsApi = {
  // Upload PDF document with progress tracking
  upload: async (file: File, onProgress?: (percent: number) => void): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document', file);

    const res = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return res.data.data;
  },

  // Delete uploaded document
  deleteDocument: async (documentId: string): Promise<boolean> => {
    const res = await apiClient.delete(`/documents/${documentId}`);
    return res.data.success;
  },
};
