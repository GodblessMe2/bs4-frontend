import apiClient from './client';

export const documentsApi = {
  // Upload PDF document with progress tracking
  upload: async (
    file: File,
    sessionToken?: string,
    onProgress?: (percent: number) => void
  ): Promise<{ file: any; metadata: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionToken) {
      formData.append('sessionToken', sessionToken);
    }

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

  // Reorder uploaded files
  reorder: async (items: Array<{ id: string; sortOrder: number }>): Promise<void> => {
    await apiClient.put('/documents/reorder', { items });
  },

  // Delete uploaded document
  deleteDocument: async (documentId: string): Promise<boolean> => {
    const res = await apiClient.delete(`/documents/${documentId}`);
    return res.data.success;
  },

  // Get signed/download URL for document
  getDownloadUrl: async (documentId: string): Promise<string> => {
    const res = await apiClient.get(`/documents/${documentId}/download`);
    return res.data.data?.downloadUrl;
  },
};
