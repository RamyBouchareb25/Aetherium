"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Trash2,
  Plus,
  Send,
  Copy,
  History,
  Download,
  Eye,
  Code,
  FileText,
  ImageIcon,
  Search,
  Trash,
  FileDown,
  FileUp,
  Folder,
  FolderPlus,
  Edit3,
  ChevronRight,
  ChevronDown,
  ShieldOff,
} from "lucide-react"

interface Header {
  key: string
  value: string
  enabled: boolean
}

interface HttpRequest {
  method: string
  url: string
  headers: Header[]
  body: string
  bodyType: "json" | "text" | "form" | "none"
  insecureSSL: boolean
}

interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
  url?: string
  redirected?: boolean
  request?: {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
  }
}

interface HistoryItem {
  id: string
  request: HttpRequest
  response: HttpResponse
  timestamp: number
  name?: string
}

interface CollectionRequest {
  id: string
  name: string
  request: HttpRequest
  description?: string
}

interface Collection {
  id: string
  name: string
  description?: string
  requests: CollectionRequest[]
  expanded?: boolean
}

export function HttpClient() {
  const [request, setRequest] = useState<HttpRequest>({
    method: "GET",
    url: "",
    headers: [{ key: "", value: "", enabled: true }],
    body: "",
    bodyType: "json",
    insecureSSL: false,
  })

  const [response, setResponse] = useState<HttpResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historySearch, setHistorySearch] = useState("")
  const [historyFilter, setHistoryFilter] = useState<string>("all")
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  const [collections, setCollections] = useState<Collection[]>([])
  const [showCollectionsDialog, setShowCollectionsDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [editingCollection, setEditingCollection] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<string | null>(null)

  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

  useEffect(() => {
    const savedHistory = localStorage.getItem("http-client-history")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error("Failed to load history:", error)
      }
    }

    const savedCollections = localStorage.getItem("http-client-collections")
    if (savedCollections) {
      try {
        setCollections(JSON.parse(savedCollections))
      } catch (error) {
        console.error("Failed to load collections:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("http-client-history", JSON.stringify(history))
    }
  }, [history])

  useEffect(() => {
    if (collections.length > 0) {
      localStorage.setItem("http-client-collections", JSON.stringify(collections))
    }
  }, [collections])

  const addHeader = () => {
    setRequest((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: "", value: "", enabled: true }],
    }))
  }

  const removeHeader = (index: number) => {
    setRequest((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }))
  }

  const updateHeader = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    setRequest((prev) => ({
      ...prev,
      headers: prev.headers.map((header, i) => (i === index ? { ...header, [field]: value } : header)),
    }))
  }

  const createCollection = () => {
    if (!newCollectionName.trim()) return

    const newCollection: Collection = {
      id: `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newCollectionName.trim(),
      requests: [],
      expanded: true,
    }

    setCollections((prev) => [...prev, newCollection])
    setNewCollectionName("")
  }

  const deleteCollection = (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId))
  }

  const updateCollectionName = (collectionId: string, newName: string) => {
    setCollections((prev) => prev.map((c) => (c.id === collectionId ? { ...c, name: newName } : c)))
    setEditingCollection(null)
  }

  const toggleCollection = (collectionId: string) => {
    setCollections((prev) => prev.map((c) => (c.id === collectionId ? { ...c, expanded: !c.expanded } : c)))
  }

  const saveCurrentRequestToCollection = (collectionId: string) => {
    if (!request.url) return

    const newRequest: CollectionRequest = {
      id: `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${request.method} ${new URL(request.url).pathname}`,
      request: { ...request },
    }

    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, requests: [...c.requests, newRequest] } : c)),
    )
  }

  const deleteRequestFromCollection = (collectionId: string, requestId: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, requests: c.requests.filter((r) => r.id !== requestId) } : c)),
    )
  }

  const updateRequestName = (collectionId: string, requestId: string, newName: string) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              requests: c.requests.map((r) => (r.id === requestId ? { ...r, name: newName } : r)),
            }
          : c,
      ),
    )
    setEditingRequest(null)
  }

  const loadRequestFromCollection = (collectionRequest: CollectionRequest) => {
    setRequest(collectionRequest.request)
    setResponse(null)
    setShowCollectionsDialog(false)
  }

  const exportCollections = () => {
    const dataStr = JSON.stringify(collections, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `http-client-collections-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importCollections = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedCollections = JSON.parse(e.target?.result as string)
        if (Array.isArray(importedCollections)) {
          setCollections((prev) => [...prev, ...importedCollections])
        }
      } catch (error) {
        console.error("Failed to import collections:", error)
      }
    }
    reader.readAsText(file)
  }

  const sendRequest = async () => {
    if (!request.url.trim()) return

    setLoading(true)
    setResponse(null)

    const startTime = Date.now()

    try {
      const enabledHeaders = request.headers
        .filter((h) => h.enabled && h.key && h.value)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})

      const requestBody =
        request.method === "GET" || request.method === "HEAD" || request.bodyType === "none" ? undefined : request.body

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: request.method,
          url: request.url.trim(),
          headers: enabledHeaders,
          body: requestBody,
          insecureSSL: request.insecureSSL,
        }),
      })

      const data = await res.json()
      const endTime = Date.now()

      const responseData: HttpResponse = {
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        body: data.body,
        time: endTime - startTime,
        size: new Blob([data.body]).size,
        url: data.url,
        redirected: data.redirected,
        request: {
          method: request.method,
          url: request.url,
          headers: enabledHeaders,
          body: requestBody,
        },
      }

      setResponse(responseData)

      const historyItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        request: { ...request },
        response: responseData,
        timestamp: Date.now(),
        name: `${request.method} ${new URL(request.url).pathname}`,
      }

      setHistory((prev) => [historyItem, ...prev.slice(0, 99)]) // Keep last 100 requests
    } catch (error) {
      console.error("Request failed:", error)
      const errorResponse: HttpResponse = {
        status: 0,
        statusText: "Error",
        headers: {},
        body: error instanceof Error ? error.message : "Unknown error",
        time: Date.now() - startTime,
        size: 0,
      }
      setResponse(errorResponse)

      const historyItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        request: { ...request },
        response: errorResponse,
        timestamp: Date.now(),
        name: `${request.method} ${request.url} (Failed)`,
      }

      setHistory((prev) => [historyItem, ...prev.slice(0, 99)])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem("http-client-history")
  }

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }

  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `http-client-history-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedHistory = JSON.parse(e.target?.result as string)
        if (Array.isArray(importedHistory)) {
          setHistory((prev) => [...importedHistory, ...prev])
        }
      } catch (error) {
        console.error("Failed to import history:", error)
      }
    }
    reader.readAsText(file)
  }

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.request.url.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.request.method.toLowerCase().includes(historySearch.toLowerCase())

    const matchesFilter =
      historyFilter === "all" ||
      (historyFilter === "success" && item.response.status >= 200 && item.response.status < 300) ||
      (historyFilter === "error" && (item.response.status >= 400 || item.response.status === 0)) ||
      historyFilter === item.request.method.toLowerCase()

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500"
    if (status >= 300 && status < 400) return "bg-yellow-500"
    if (status >= 400 && status < 500) return "bg-orange-500"
    if (status >= 500) return "bg-red-500"
    return "bg-gray-500"
  }

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  const getContentType = (headers: Record<string, string>) => {
    const contentType = headers["content-type"] || headers["Content-Type"] || ""
    if (contentType.includes("application/json")) return "json"
    if (contentType.includes("text/html")) return "html"
    if (contentType.includes("text/xml") || contentType.includes("application/xml")) return "xml"
    if (contentType.includes("text/css")) return "css"
    if (contentType.includes("text/javascript") || contentType.includes("application/javascript")) return "javascript"
    if (contentType.includes("image/")) return "image"
    if (contentType.includes("text/")) return "text"
    return "raw"
  }

  const formatResponseBody = (body: string, contentType: string) => {
    switch (contentType) {
      case "json":
        try {
          return JSON.stringify(JSON.parse(body), null, 2)
        } catch {
          return body
        }
      case "xml":
      case "html":
        try {
          return body.replace(/></g, ">\n<").replace(/^\s*\n/gm, "")
        } catch {
          return body
        }
      default:
        return body
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const getResponseTimeColor = (time: number) => {
    if (time < 200) return "text-green-500"
    if (time < 500) return "text-yellow-500"
    if (time < 1000) return "text-orange-500"
    return "text-red-500"
  }

  const downloadResponse = () => {
    if (!response) return
    const blob = new Blob([response.body], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `response-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getHistoryStats = () => {
    const total = history.length
    const successful = history.filter((item) => item.response.status >= 200 && item.response.status < 300).length
    const failed = history.filter((item) => item.response.status >= 400 || item.response.status === 0).length
    const avgResponseTime =
      history.length > 0 ? Math.round(history.reduce((sum, item) => sum + item.response.time, 0) / history.length) : 0

    return { total, successful, failed, avgResponseTime }
  }

  const stats = getHistoryStats()

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">HTTP Client</h1>
        </div>

        <div className="space-y-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => {
              setRequest({
                method: "GET",
                url: "",
                headers: [{ key: "", value: "", enabled: true }],
                body: "",
                bodyType: "json",
                insecureSSL: false,
              })
              setResponse(null)
            }}
          >
            <Send className="w-4 h-4" />
            New Request
          </Button>

          <Dialog open={showCollectionsDialog} onOpenChange={setShowCollectionsDialog}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Folder className="w-4 h-4" />
                Collections ({collections.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Request Collections
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New collection name..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && createCollection()}
                  />
                  <Button onClick={createCollection} disabled={!newCollectionName.trim()}>
                    <FolderPlus className="w-4 h-4 mr-1" />
                    Create
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportCollections}>
                    <FileDown className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("import-collections")?.click()}
                  >
                    <FileUp className="w-4 h-4 mr-1" />
                    Import
                  </Button>
                  <input
                    id="import-collections"
                    type="file"
                    accept=".json"
                    onChange={importCollections}
                    className="hidden"
                  />
                  {request.url && (
                    <Select onValueChange={(collectionId) => saveCurrentRequestToCollection(collectionId)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Save to collection..." />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <div key={collection.id} className="border border-border/50 rounded-md">
                        <div className="flex items-center justify-between p-3 bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleCollection(collection.id)}
                            >
                              {collection.expanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <Folder className="w-4 h-4 text-muted-foreground" />
                            {editingCollection === collection.id ? (
                              <Input
                                value={collection.name}
                                onChange={(e) => updateCollectionName(collection.id, e.target.value)}
                                onBlur={() => setEditingCollection(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateCollectionName(collection.id, e.currentTarget.value)
                                  }
                                }}
                                className="h-6 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium">{collection.name}</span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {collection.requests.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingCollection(collection.id)}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => deleteCollection(collection.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {collection.expanded && (
                          <div className="p-2 space-y-1">
                            {collection.requests.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No requests in this collection
                              </p>
                            ) : (
                              collection.requests.map((req) => (
                                <div
                                  key={req.id}
                                  className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                                  onClick={() => loadRequestFromCollection(req)}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Badge variant="outline" className="text-xs">
                                      {req.request.method}
                                    </Badge>
                                    {editingRequest === req.id ? (
                                      <Input
                                        value={req.name}
                                        onChange={(e) => updateRequestName(collection.id, req.id, e.target.value)}
                                        onBlur={() => setEditingRequest(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            updateRequestName(collection.id, req.id, e.currentTarget.value)
                                          }
                                        }}
                                        className="h-6 text-sm"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <span className="text-sm truncate">{req.name}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingRequest(req.id)
                                      }}
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteRequestFromCollection(collection.id, req.id)
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {collections.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No collections yet</p>
                        <p className="text-xs">Create a collection to organize your requests</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <History className="w-4 h-4" />
                History ({history.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Request History
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search history..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={historyFilter} onValueChange={setHistoryFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="get">GET</SelectItem>
                      <SelectItem value="post">POST</SelectItem>
                      <SelectItem value="put">PUT</SelectItem>
                      <SelectItem value="delete">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{stats.successful}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{stats.avgResponseTime}ms</div>
                    <div className="text-xs text-muted-foreground">Avg Time</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportHistory}>
                    <FileDown className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("import-history")?.click()}
                  >
                    <FileUp className="w-4 h-4 mr-1" />
                    Import
                  </Button>
                  <input id="import-history" type="file" accept=".json" onChange={importHistory} className="hidden" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearHistory}
                    className="text-destructive bg-transparent"
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className="group p-3 rounded-md border border-border/50 hover:border-border transition-colors cursor-pointer"
                        onClick={() => {
                          setRequest(item.request)
                          setResponse(item.response)
                          setShowHistoryDialog(false)
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.request.method}
                            </Badge>
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(item.response.status)}`} />
                            <span className="text-sm font-medium">{item.response.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteHistoryItem(item.id)
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-foreground truncate mb-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.request.url}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className={getResponseTimeColor(item.response.time)}>{item.response.time}ms</span>
                          <span>{formatFileSize(item.response.size)}</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {filteredHistory.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No requests found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {history.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-sidebar-foreground mb-2">Recent Requests</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {history.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-md bg-sidebar-accent cursor-pointer hover:bg-sidebar-accent/80"
                    onClick={() => {
                      setRequest(item.request)
                      setResponse(item.response)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.request.method}
                      </Badge>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(item.response.status)}`} />
                    </div>
                    <p className="text-xs text-sidebar-foreground/70 truncate mt-1">{item.request.url}</p>
                    <p className="text-xs text-sidebar-foreground/50">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Request Builder
                </div>
                {request.url && collections.length > 0 && (
                  <Select onValueChange={(collectionId) => saveCurrentRequestToCollection(collectionId)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Save to collection..." />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            {collection.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={request.method}
                  onValueChange={(value) => setRequest((prev) => ({ ...prev, method: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {httpMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        <Badge variant={method === "GET" ? "default" : method === "POST" ? "secondary" : "outline"}>
                          {method}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter request URL"
                  value={request.url}
                  onChange={(e) => setRequest((prev) => ({ ...prev, url: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  variant={request.insecureSSL ? "destructive" : "outline"}
                  size="sm"
                  onClick={() =>
                    setRequest((prev) => ({
                      ...prev,
                      insecureSSL: !prev.insecureSSL,
                    }))
                  }
                  className="px-3"
                  title={request.insecureSSL ? "SSL verification disabled (insecure)" : "Enable insecure SSL (skip certificate verification)"}
                >
                  <ShieldOff className="w-4 h-4" />
                  {request.insecureSSL && <span className="ml-1 text-xs">INSECURE</span>}
                </Button>
                <Button onClick={sendRequest} disabled={loading || !request.url} className="px-6">
                  {loading ? "Sending..." : "Send"}
                </Button>
              </div>

              {request.insecureSSL && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <ShieldOff className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    ⚠️ SSL certificate verification is disabled (insecure mode)
                  </span>
                </div>
              )}

              <Tabs defaultValue="headers" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="params">Params</TabsTrigger>
                  <TabsTrigger value="auth">Auth</TabsTrigger>
                </TabsList>

                <TabsContent value="headers" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Headers</Label>
                    <Button variant="outline" size="sm" onClick={addHeader}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Header
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {request.headers.map((header, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => updateHeader(index, "key", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => updateHeader(index, "value", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHeader(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="body" className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label>Body Type:</Label>
                    <Select
                      value={request.bodyType}
                      onValueChange={(value: "json" | "text" | "form" | "none") =>
                        setRequest((prev) => ({ ...prev, bodyType: value }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="form">Form Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {request.bodyType !== "none" && (
                    <Textarea
                      placeholder={request.bodyType === "json" ? '{\n  "key": "value"\n}' : "Enter request body"}
                      value={request.body}
                      onChange={(e) =>
                        setRequest((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      className="min-h-32 font-mono"
                    />
                  )}
                </TabsContent>

                <TabsContent value="params">
                  <p className="text-muted-foreground">URL parameters will be parsed automatically from the URL.</p>
                </TabsContent>

                <TabsContent value="auth">
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          id="insecure-ssl-detailed"
                          checked={request.insecureSSL}
                          onChange={(e) =>
                            setRequest((prev) => ({
                              ...prev,
                              insecureSSL: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Label htmlFor="insecure-ssl-detailed" className="text-sm font-medium">
                          Allow Insecure SSL (Skip certificate verification)
                        </Label>
                        {request.insecureSSL && (
                          <Badge variant="destructive" className="text-xs">
                            INSECURE
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>⚠️ This option disables SSL certificate verification, similar to curl&apos;s --insecure flag.</p>
                        <p>• Use only for testing with self-signed certificates or development environments</p>
                        <p>• Never use in production or with sensitive data</p>
                        <p>• This is equivalent to: <code className="bg-muted px-1 rounded">curl --insecure</code></p>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      <p className="text-sm">Other authentication options coming soon:</p>
                      <ul className="text-xs mt-2 space-y-1 ml-4">
                        <li>• Bearer Token</li>
                        <li>• Basic Auth</li>
                        <li>• API Key</li>
                        <li>• OAuth 2.0</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {response && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Response</span>
                    {(() => {
                      const contentType = getContentType(response.headers)
                      switch (contentType) {
                        case "json":
                          return <Code className="w-4 h-4 text-blue-500" />
                        case "html":
                          return <FileText className="w-4 h-4 text-orange-500" />
                        case "image":
                          return <ImageIcon className="w-4 h-4 text-green-500" />
                        default:
                          return <Eye className="w-4 h-4 text-gray-500" />
                      }
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(response.status)}>
                      {response.status} {response.statusText}
                    </Badge>
                    <Badge variant="outline" className={getResponseTimeColor(response.time)}>
                      {response.time}ms
                    </Badge>
                    <Badge variant="outline">{formatFileSize(response.size)}</Badge>
                    {response.redirected && <Badge variant="secondary">Redirected</Badge>}
                    {request.insecureSSL && (
                      <Badge variant="destructive" className="text-xs" title="Request made with SSL verification disabled">
                        <ShieldOff className="w-3 h-3 mr-1" />
                        INSECURE SSL
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={downloadResponse}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                {response.url && response.url !== request.url && (
                  <p className="text-sm text-muted-foreground">Final URL: {response.url}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span>
                    Content-Type: {response.headers["content-type"] || response.headers["Content-Type"] || "Unknown"}
                  </span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Size: {formatFileSize(response.size)}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Time: {response.time}ms</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>Response Time</span>
                    <span className={getResponseTimeColor(response.time)}>{response.time}ms</span>
                  </div>
                  <Progress value={Math.min((response.time / 2000) * 100, 100)} className="h-1" />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="body" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="body">
                      Body
                      {response.body && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {formatFileSize(response.size)}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="headers">
                      Headers
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {Object.keys(response.headers).length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="cookies">Cookies</TabsTrigger>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>

                  <TabsContent value="body">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={() => navigator.clipboard.writeText(response.body)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={downloadResponse}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <Tabs defaultValue="formatted" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                          <TabsTrigger value="formatted">Formatted</TabsTrigger>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                          <TabsTrigger value="raw">Raw</TabsTrigger>
                        </TabsList>

                        <TabsContent value="formatted">
                          <ScrollArea className="h-96 w-full overflow-auto">
                            <div className="max-w-full overflow-hidden">
                              {(() => {
                                const contentType = getContentType(response.headers)
                                if (contentType === "image") {
                                  return (
                                    <div className="flex items-center justify-center h-full bg-muted rounded-md">
                                      <div className="text-center">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Image content detected</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Size: {formatFileSize(response.size)}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                }

                                let formattedContent = response.body
                                if (contentType === "json") {
                                  formattedContent = formatJson(response.body)
                                } else {
                                  formattedContent = formatResponseBody(response.body, contentType)
                                }

                                return (
                                  <pre
                                    className="text-sm bg-muted p-4 rounded-md font-mono whitespace-pre-wrap overflow-hidden max-w-full"
                                    style={{
                                      wordBreak: "break-word",
                                      overflowWrap: "anywhere",
                                      maxWidth: "100%",
                                      width: "100%",
                                    }}
                                  >
                                    {formattedContent}
                                  </pre>
                                )
                              })()}
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        <TabsContent value="preview">
                          <ScrollArea className="h-96 w-full overflow-auto">
                            <div className="max-w-full overflow-hidden">
                              {(() => {
                                const contentType = getContentType(response.headers)

                                if (contentType === "html") {
                                  return (
                                    <div className="border border-border rounded-md overflow-hidden max-w-full">
                                      <div className="bg-muted px-3 py-2 text-sm font-medium border-b border-border">
                                        HTML Preview
                                      </div>
                                      <iframe
                                        srcDoc={response.body}
                                        className="w-full h-80 border-0 bg-white"
                                        sandbox="allow-same-origin"
                                        title="HTML Preview"
                                        style={{ backgroundColor: "white" }}
                                      />
                                    </div>
                                  )
                                }

                                if (contentType === "json") {
                                  try {
                                    JSON.parse(response.body) // Just validate the JSON
                                    return (
                                      <div className="bg-muted p-4 rounded-md max-w-full">
                                        <div className="text-sm font-medium mb-2 text-muted-foreground">
                                          JSON Structure
                                        </div>
                                        <pre
                                          className="text-sm font-mono whitespace-pre-wrap overflow-hidden max-w-full text-foreground"
                                          style={{
                                            wordBreak: "break-word",
                                            overflowWrap: "anywhere",
                                            maxWidth: "100%",
                                            width: "100%",
                                          }}
                                        >
                                          {formatJson(response.body)}
                                        </pre>
                                      </div>
                                    )
                                  } catch {
                                    return (
                                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                                        <p>Invalid JSON format</p>
                                      </div>
                                    )
                                  }
                                }

                                if (contentType === "image") {
                                  return (
                                    <div className="flex items-center justify-center h-full bg-muted rounded-md">
                                      <div className="text-center">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Image preview not available</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Size: {formatFileSize(response.size)}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                }

                                return (
                                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                                    <p>Preview not available for this content type</p>
                                  </div>
                                )
                              })()}
                            </div>
                          </ScrollArea>
                        </TabsContent>

                        <TabsContent value="raw">
                          <ScrollArea className="h-96 w-full overflow-auto">
                            <div className="max-w-full overflow-hidden">
                              <pre
                                className="text-sm bg-muted p-4 rounded-md font-mono whitespace-pre-wrap overflow-hidden max-w-full"
                                style={{
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  maxWidth: "100%",
                                  width: "100%",
                                }}
                              >
                                {response.body}
                              </pre>
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>

                  <TabsContent value="headers">
                    <ScrollArea className="h-96 w-full overflow-auto">
                      <div className="space-y-3 max-w-full">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="group">
                            <div className="flex items-start gap-3 p-3 rounded-md border border-border/50 hover:border-border transition-colors max-w-full">
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm capitalize text-foreground">{key}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                    onClick={() => navigator.clipboard.writeText(`${key}: ${value}`)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                <p
                                  className="font-mono text-sm text-muted-foreground max-w-full"
                                  style={{
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                    maxWidth: "100%",
                                    width: "100%",
                                  }}
                                >
                                  {value}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="cookies">
                    <ScrollArea className="h-96 w-full overflow-auto">
                      <div className="max-w-full overflow-hidden">
                        {(() => {
                          const setCookieHeader = response.headers["set-cookie"] || response.headers["Set-Cookie"]
                          if (!setCookieHeader) {
                            return (
                              <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <p>No cookies found in response</p>
                              </div>
                            )
                          }

                          const cookies = setCookieHeader.split(",").map((cookie, index) => (
                            <div key={index} className="p-3 border border-border/50 rounded-md mb-2 max-w-full">
                              <p
                                className="font-mono text-sm"
                                style={{
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  maxWidth: "100%",
                                  width: "100%",
                                }}
                              >
                                {cookie.trim()}
                              </p>
                            </div>
                          ))

                          return <div className="space-y-2 max-w-full">{cookies}</div>
                        })()}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="request">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Method</Label>
                          <div className="mt-1 p-2 bg-muted rounded border">
                            <span
                              className={`font-mono font-semibold ${
                                response.request?.method === "GET"
                                  ? "text-green-400"
                                  : response.request?.method === "POST"
                                    ? "text-blue-400"
                                    : response.request?.method === "PUT"
                                      ? "text-yellow-400"
                                      : response.request?.method === "DELETE"
                                        ? "text-red-400"
                                        : "text-purple-400"
                              }`}
                            >
                              {response.request?.method}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">URL</Label>
                          <div className="mt-1 p-2 bg-muted rounded border">
                            <span className="font-mono text-sm break-all">{response.request?.url}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Request Headers</Label>
                        <div className="mt-1 bg-muted rounded border">
                          {response.request?.headers && Object.keys(response.request.headers).length > 0 ? (
                            <div className="divide-y divide-border">
                              {Object.entries(response.request.headers).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-3">
                                  <span className="font-mono text-sm font-medium">{key}</span>
                                  <span className="font-mono text-sm text-muted-foreground break-all ml-4">
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground">No headers sent</div>
                          )}
                        </div>
                      </div>

                      {response.request?.body && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Request Body</Label>
                          <div className="mt-1 bg-muted rounded border">
                            <pre className="p-3 text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                              {response.request.body}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="raw">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
                        onClick={() => {
                          const rawResponse = `HTTP/1.1 ${response.status} ${response.statusText}\n${Object.entries(
                            response.headers,
                          )
                            .map(([key, value]) => `${key}: ${value}`)
                            .join("\n")}\n\n${response.body}`
                          navigator.clipboard.writeText(rawResponse)
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <ScrollArea className="h-96 w-full overflow-auto">
                        <div className="max-w-full overflow-hidden">
                          <pre
                            className="text-sm bg-muted p-4 rounded-md font-mono whitespace-pre-wrap overflow-hidden max-w-full"
                            style={{
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              maxWidth: "100%",
                              width: "100%",
                            }}
                          >
                            {`HTTP/1.1 ${response.status} ${response.statusText}\n${Object.entries(response.headers)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join("\n")}\n\n${response.body}`}
                          </pre>
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
