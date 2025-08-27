import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Types for the application
export type BodyType = "json" | "text" | "form" | "none";

export interface HttpRequest {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body: string;
  bodyType: BodyType;
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

// Database types
export interface DbHistoryItem {
  id: string;
  method: string;
  url: string;
  headers: string; // JSON string
  body: string;
  bodyType: string;
  insecureSSL: number; // SQLite boolean (0/1)
  caCertificate?: string;
  responseStatus: number;
  responseStatusText: string;
  responseHeaders: string; // JSON string
  responseBody: string;
  responseTime: number;
  responseSize: number;
  responseUrl?: string;
  redirected: number; // SQLite boolean (0/1)
  timestamp: number;
  name?: string;
}

export interface DbCollection {
  id: string;
  name: string;
  description?: string;
  expanded: number; // SQLite boolean (0/1)
  caCertificate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DbCollectionRequest {
  id: string;
  collectionId: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: string; // JSON string
  body: string;
  bodyType: string;
  insecureSSL: number; // SQLite boolean (0/1)
  caCertificate?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// Database path - use environment variable or default
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'aetherium.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
const initSchema = () => {
  // History table
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT NOT NULL DEFAULT '{}',
      body TEXT NOT NULL DEFAULT '',
      bodyType TEXT NOT NULL DEFAULT 'none',
      insecureSSL INTEGER NOT NULL DEFAULT 0,
      caCertificate TEXT,
      responseStatus INTEGER NOT NULL,
      responseStatusText TEXT NOT NULL,
      responseHeaders TEXT NOT NULL DEFAULT '{}',
      responseBody TEXT NOT NULL DEFAULT '',
      responseTime INTEGER NOT NULL,
      responseSize INTEGER NOT NULL,
      responseUrl TEXT,
      redirected INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      name TEXT
    )
  `);

  // Collections table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      expanded INTEGER NOT NULL DEFAULT 1,
      caCertificate TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Collection requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collection_requests (
      id TEXT PRIMARY KEY,
      collectionId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT NOT NULL DEFAULT '{}',
      body TEXT NOT NULL DEFAULT '',
      bodyType TEXT NOT NULL DEFAULT 'none',
      insecureSSL INTEGER NOT NULL DEFAULT 0,
      caCertificate TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_history_method ON history(method);
    CREATE INDEX IF NOT EXISTS idx_history_status ON history(responseStatus);
    CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);
    CREATE INDEX IF NOT EXISTS idx_collection_requests_collection_id ON collection_requests(collectionId);
    CREATE INDEX IF NOT EXISTS idx_collection_requests_order ON collection_requests("order");
  `);
};

// Initialize schema
initSchema();

// Prepared statements for better performance
const statements = {
  // History statements
  insertHistory: db.prepare(`
    INSERT INTO history (
      id, method, url, headers, body, bodyType, insecureSSL, caCertificate,
      responseStatus, responseStatusText, responseHeaders, responseBody,
      responseTime, responseSize, responseUrl, redirected, timestamp, name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getHistory: db.prepare(`
    SELECT * FROM history 
    ORDER BY timestamp DESC 
    LIMIT ?
  `),
  
  getHistoryById: db.prepare(`SELECT * FROM history WHERE id = ?`),
  
  deleteHistory: db.prepare(`DELETE FROM history WHERE id = ?`),
  
  clearHistory: db.prepare(`DELETE FROM history`),
  
  searchHistory: db.prepare(`
    SELECT * FROM history 
    WHERE (name LIKE ? OR url LIKE ? OR method LIKE ?)
    ORDER BY timestamp DESC 
    LIMIT ?
  `),

  // Collections statements
  insertCollection: db.prepare(`
    INSERT INTO collections (id, name, description, expanded, caCertificate, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  
  getCollections: db.prepare(`
    SELECT * FROM collections 
    ORDER BY createdAt DESC
  `),
  
  getCollectionById: db.prepare(`SELECT * FROM collections WHERE id = ?`),
  
  updateCollection: db.prepare(`
    UPDATE collections 
    SET name = ?, description = ?, expanded = ?, caCertificate = ?, updatedAt = ?
    WHERE id = ?
  `),
  
  deleteCollection: db.prepare(`DELETE FROM collections WHERE id = ?`),

  // Collection requests statements
  insertCollectionRequest: db.prepare(`
    INSERT INTO collection_requests (
      id, collectionId, name, description, method, url, headers, body, bodyType,
      insecureSSL, caCertificate, "order", createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getCollectionRequests: db.prepare(`
    SELECT * FROM collection_requests 
    WHERE collectionId = ?
    ORDER BY "order" ASC
  `),
  
  getCollectionRequestById: db.prepare(`
    SELECT * FROM collection_requests 
    WHERE id = ?
  `),
  
  updateCollectionRequest: db.prepare(`
    UPDATE collection_requests 
    SET name = ?, description = ?, method = ?, url = ?, headers = ?, body = ?, 
        bodyType = ?, insecureSSL = ?, caCertificate = ?, "order" = ?, updatedAt = ?
    WHERE id = ?
  `),
  
  deleteCollectionRequest: db.prepare(`DELETE FROM collection_requests WHERE id = ?`),
  
  getMaxOrder: db.prepare(`
    SELECT COALESCE(MAX("order"), -1) as maxOrder 
    FROM collection_requests 
    WHERE collectionId = ?
  `),
};

export { db, statements };

// Helper functions to convert between app types and database types
export const convertToDbHistory = (item: HistoryItem): Omit<DbHistoryItem, 'id'> => ({
  method: item.request.method,
  url: item.request.url,
  headers: JSON.stringify(item.request.headers || []),
  body: item.request.body || '',
  bodyType: item.request.bodyType || 'none',
  insecureSSL: item.request.insecureSSL ? 1 : 0,
  caCertificate: item.request.caCertificate,
  responseStatus: item.response.status,
  responseStatusText: item.response.statusText,
  responseHeaders: JSON.stringify(item.response.headers || {}),
  responseBody: item.response.body || '',
  responseTime: item.response.time,
  responseSize: item.response.size,
  responseUrl: item.response.url,
  redirected: item.response.redirected ? 1 : 0,
  timestamp: item.timestamp,
  name: item.name,
});

export const convertFromDbHistory = (dbItem: DbHistoryItem): HistoryItem => ({
  id: dbItem.id,
  request: {
    method: dbItem.method,
    url: dbItem.url,
    headers: JSON.parse(dbItem.headers),
    body: dbItem.body,
    bodyType: dbItem.bodyType as BodyType,
    insecureSSL: dbItem.insecureSSL === 1,
    caCertificate: dbItem.caCertificate,
  },
  response: {
    status: dbItem.responseStatus,
    statusText: dbItem.responseStatusText,
    headers: JSON.parse(dbItem.responseHeaders),
    body: dbItem.responseBody,
    time: dbItem.responseTime,
    size: dbItem.responseSize,
    url: dbItem.responseUrl,
    redirected: dbItem.redirected === 1,
  },
  timestamp: dbItem.timestamp,
  name: dbItem.name,
});

export const convertToDbCollection = (collection: Collection): Omit<DbCollection, 'createdAt' | 'updatedAt'> => ({
  id: collection.id,
  name: collection.name,
  description: collection.description,
  expanded: collection.expanded ? 1 : 0,
  caCertificate: collection.caCertificate,
});

export const convertFromDbCollection = (dbCollection: DbCollection): Omit<Collection, 'requests'> => ({
  id: dbCollection.id,
  name: dbCollection.name,
  description: dbCollection.description,
  expanded: dbCollection.expanded === 1,
  caCertificate: dbCollection.caCertificate,
});

export const convertToDbCollectionRequest = (request: CollectionRequest, collectionId: string, order: number): Omit<DbCollectionRequest, 'createdAt' | 'updatedAt'> => ({
  id: request.id,
  collectionId,
  name: request.name,
  description: request.description,
  method: request.request.method,
  url: request.request.url,
  headers: JSON.stringify(request.request.headers || []),
  body: request.request.body || '',
  bodyType: request.request.bodyType || 'none',
  insecureSSL: request.request.insecureSSL ? 1 : 0,
  caCertificate: request.request.caCertificate,
  order,
});

export const convertFromDbCollectionRequest = (dbRequest: DbCollectionRequest): CollectionRequest => ({
  id: dbRequest.id,
  name: dbRequest.name,
  description: dbRequest.description,
  request: {
    method: dbRequest.method,
    url: dbRequest.url,
    headers: JSON.parse(dbRequest.headers),
    body: dbRequest.body,
    bodyType: dbRequest.bodyType as BodyType,
    insecureSSL: dbRequest.insecureSSL === 1,
    caCertificate: dbRequest.caCertificate,
  },
});
