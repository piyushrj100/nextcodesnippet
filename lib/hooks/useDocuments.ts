'use client';

import { useState, useCallback, useRef } from 'react';
import { ragService } from '../services/rag.service';
import { DocumentUploadRequest, PageIndexTreeResponse } from '@/types/api';

/**
 * Hook for uploading documents to PageIndex.
 * Includes automatic status polling until processing completes.
 */
export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /**
   * Poll PageIndex for document processing status.
   * Resolves when status is "completed", rejects on "failed".
   */
  const pollUntilReady = useCallback(
    (docId: string, intervalMs = 3000): Promise<void> => {
      return new Promise((resolve, reject) => {
        const check = async () => {
          try {
            const status = await ragService.getDocumentStatus(docId);
            setProcessingStatus(status.status);

            if (status.status === 'completed') {
              stopPolling();
              resolve();
            } else if (status.status === 'failed') {
              stopPolling();
              reject(new Error('Document processing failed'));
            }
            // "queued" or "processing" → continue polling
          } catch (err) {
            stopPolling();
            reject(err);
          }
        };

        // Initial check
        check();
        // Then poll at interval
        pollRef.current = setInterval(check, intervalMs);
      });
    },
    [stopPolling]
  );

  const uploadDocuments = useCallback(
    async (request: DocumentUploadRequest, waitForReady = true) => {
      setIsUploading(true);
      setUploadProgress(0);
      setProcessingStatus(null);
      setError(null);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const response = await ragService.uploadDocuments(request);

        clearInterval(progressInterval);
        setUploadProgress(100);

        // Optionally wait for PageIndex to finish processing
        if (waitForReady && response.documents.length > 0) {
          setProcessingStatus('processing');
          await pollUntilReady(response.documents[0].id);
        }

        return response;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to upload documents';
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [pollUntilReady]
  );

  return { uploadDocuments, isUploading, uploadProgress, processingStatus, error, stopPolling };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const docs = await ragService.listDocuments();
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      await ragService.deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete document');
    }
  }, []);

  /**
   * Get the PageIndex tree structure for a document.
   * Useful for tree visualization or manual tree-search approach.
   */
  const getDocumentTree = useCallback(async (docId: string): Promise<PageIndexTreeResponse | null> => {
    try {
      return await ragService.getDocumentTree(docId);
    } catch (err: any) {
      console.error('Failed to fetch document tree:', err);
      return null;
    }
  }, []);

  return { documents, fetchDocuments, deleteDocument, getDocumentTree, isLoading, error };
}
