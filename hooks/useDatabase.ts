"use client";

import { useState, useEffect, useCallback } from 'react';

// Types matching the backend
export interface HttpRequest {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body: string;
  bodyType: "json" | "text" | "form" | "none";
  insecureSSL: boolean;
  caCertificate?: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  url?: string;
  redirected?: boolean;
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
}

export interface HistoryItem {
  id: string;
  request: HttpRequest;
  response: HttpResponse;
  timestamp: number;
  name?: string;
}

export interface CollectionRequest {
  id: string;
  name: string;
  request: HttpRequest;
  description?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: CollectionRequest[];
  expanded?: boolean;
  caCertificate?: string;
}

export function useDatabase() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

  // Load history from database
  const loadHistory = useCallback(async (options?: { limit?: number; search?: string; method?: string }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.search) params.set('search', options.search);
      if (options?.method) params.set('method', options.method);
      
      const response = await fetch(`/api/history?${params}`);
      
      if (response.ok) {
        const historyData = await response.json();
        setHistory(historyData);
      } else {
        console.error('Failed to load history');
        // Fallback to localStorage for backward compatibility
        const savedHistory = localStorage.getItem("http-client-history");
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
      // Fallback to localStorage
      const savedHistory = localStorage.getItem("http-client-history");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Save history item to database
  const saveHistoryItem = useCallback(async (item: HistoryItem) => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (response.ok) {
        // Add to local state
        setHistory(prev => [item, ...prev.slice(0, 99)]);
      } else {
        console.error('Failed to save history item');
        // Fallback to localStorage
        const updatedHistory = [item, ...history.slice(0, 99)];
        setHistory(updatedHistory);
        localStorage.setItem("http-client-history", JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error('Error saving history:', error);
      // Fallback to localStorage
      const updatedHistory = [item, ...history.slice(0, 99)];
      setHistory(updatedHistory);
      localStorage.setItem("http-client-history", JSON.stringify(updatedHistory));
    }
  }, [history]);

  // Delete history item
  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
      } else {
        console.error('Failed to delete history item');
      }
    } catch (error) {
      console.error('Error deleting history:', error);
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/history?id=all', {
        method: 'DELETE'
      });

      if (response.ok) {
        setHistory([]);
        localStorage.removeItem("http-client-history");
      } else {
        console.error('Failed to clear history');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }, []);

  // Load collections from database
  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/collections');
      
      if (response.ok) {
        const collectionsData = await response.json();
        setCollections(collectionsData);
      } else {
        console.error('Failed to load collections');
        // Fallback to localStorage
        const savedCollections = localStorage.getItem("http-client-collections");
        if (savedCollections) {
          setCollections(JSON.parse(savedCollections));
        }
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      // Fallback to localStorage
      const savedCollections = localStorage.getItem("http-client-collections");
      if (savedCollections) {
        setCollections(JSON.parse(savedCollections));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Save collection to database
  const saveCollection = useCallback(async (collection: Collection) => {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection)
      });

      if (response.ok) {
        setCollections(prev => [...prev, collection]);
      } else {
        console.error('Failed to save collection');
        // Fallback to localStorage
        const updatedCollections = [...collections, collection];
        setCollections(updatedCollections);
        localStorage.setItem("http-client-collections", JSON.stringify(updatedCollections));
      }
    } catch (error) {
      console.error('Error saving collection:', error);
      // Fallback to localStorage
      const updatedCollections = [...collections, collection];
      setCollections(updatedCollections);
      localStorage.setItem("http-client-collections", JSON.stringify(updatedCollections));
    }
  }, [collections]);

  // Update collection
  const updateCollection = useCallback(async (collection: Collection) => {
    try {
      const response = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection)
      });

      if (response.ok) {
        setCollections(prev => prev.map(c => c.id === collection.id ? collection : c));
      } else {
        console.error('Failed to update collection');
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  }, []);

  // Delete collection
  const deleteCollection = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/collections?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCollections(prev => prev.filter(c => c.id !== id));
      } else {
        console.error('Failed to delete collection');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  }, []);

  // Save request to collection
  const saveRequestToCollection = useCallback(async (collectionId: string, request: CollectionRequest) => {
    try {
      const response = await fetch('/api/collections/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, request })
      });

      if (response.ok) {
        setCollections(prev => prev.map(c => 
          c.id === collectionId 
            ? { ...c, requests: [...c.requests, request] }
            : c
        ));
      } else {
        console.error('Failed to save request to collection');
      }
    } catch (error) {
      console.error('Error saving request to collection:', error);
    }
  }, []);

  // Update request in collection
  const updateCollectionRequest = useCallback(async (collectionId: string, requestId: string, name: string, description?: string) => {
    try {
      const response = await fetch('/api/collections/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, name, description })
      });

      if (response.ok) {
        setCollections(prev => prev.map(c => 
          c.id === collectionId 
            ? {
                ...c,
                requests: c.requests.map(r => 
                  r.id === requestId 
                    ? { ...r, name, description }
                    : r
                )
              }
            : c
        ));
      } else {
        console.error('Failed to update collection request');
      }
    } catch (error) {
      console.error('Error updating collection request:', error);
    }
  }, []);

  // Delete request from collection
  const deleteCollectionRequest = useCallback(async (collectionId: string, requestId: string) => {
    try {
      const response = await fetch(`/api/collections/requests?id=${requestId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCollections(prev => prev.map(c => 
          c.id === collectionId 
            ? { ...c, requests: c.requests.filter(r => r.id !== requestId) }
            : c
        ));
      } else {
        console.error('Failed to delete collection request');
      }
    } catch (error) {
      console.error('Error deleting collection request:', error);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadHistory();
    loadCollections();
  }, [loadHistory, loadCollections]);

  return {
    // State
    history,
    collections,
    loading,
    
    // History operations
    loadHistory,
    saveHistoryItem,
    deleteHistoryItem,
    clearHistory,
    
    // Collection operations
    loadCollections,
    saveCollection,
    updateCollection,
    deleteCollection,
    saveRequestToCollection,
    updateCollectionRequest,
    deleteCollectionRequest,
  };
}
