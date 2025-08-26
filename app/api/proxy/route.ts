import { type NextRequest, NextResponse } from "next/server"
import { lookup } from "dns/promises"
import { promisify } from "util"
import dns from "dns"
import fs from "fs"
import https from "node:https"
import http from "node:http"

const dnsLookup = promisify(dns.lookup)

// Custom request function for handling insecure SSL
async function makeRequest(url: string, options: RequestInit & { insecureSSL?: boolean }): Promise<Response> {
  const { insecureSSL, ...fetchOptions } = options
  
  // If insecure SSL is not requested, use normal fetch
  if (!insecureSSL || !url.startsWith('https://')) {
    return fetch(url, fetchOptions)
  }

  // For insecure SSL HTTPS requests, use Node.js https module
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: fetchOptions.method || 'GET',
      headers: fetchOptions.headers as Record<string, string>,
      rejectUnauthorized: false, // This is the key for insecure SSL
    }

    const client = isHttps ? https : http
    
    const req = client.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        // Create a Response-like object
        const response = new Response(data, {
          status: res.statusCode || 200,
          statusText: res.statusMessage || 'OK',
          headers: new Headers(res.headers as Record<string, string>)
        })
        
        // Add additional properties to match fetch Response
        Object.defineProperty(response, 'url', { value: url, writable: false })
        Object.defineProperty(response, 'redirected', { value: false, writable: false })
        
        resolve(response)
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    // Handle request timeout
    if (fetchOptions.signal) {
      fetchOptions.signal.addEventListener('abort', () => {
        req.destroy()
        reject(new Error('Request aborted'))
      })
    }

    // Write body if present
    if (fetchOptions.body) {
      req.write(fetchOptions.body)
    }
    
    req.end()
  })
}

// Helper function to check environment DNS mappings
function getEnvDnsMapping(hostname: string): string | null {
  const dnsMappings = process.env.DNS_MAPPINGS
  if (!dnsMappings) return null
  
  try {
    const mappings = dnsMappings.split(',')
    for (const mapping of mappings) {
      const [host, ip] = mapping.split('=').map(s => s.trim())
      if (host === hostname) {
        return ip
      }
    }
    return null
  } catch {
    return null
  }
}

// Helper function to check /etc/hosts for debugging
async function checkEtcHosts(hostname: string): Promise<string | null> {
  try {
    const hostsContent = await fs.promises.readFile('/etc/hosts', 'utf8')
    console.log(`[DEBUG] /etc/hosts content:\n${hostsContent}`)
    const lines = hostsContent.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) continue
      
      const parts = trimmedLine.split(/\s+/)
      if (parts.length >= 2) {
        const ip = parts[0]
        const hostnames = parts.slice(1)
        
        if (hostnames.includes(hostname)) {
          return ip
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    const { method, url, headers, body, insecureSSL } = await request.json()

    // Log incoming request
    console.log(`[${requestId}] ===== INCOMING REQUEST =====`)
    console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`)
    console.log(`[${requestId}] Client IP: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'}`)
    console.log(`[${requestId}] User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
    console.log(`[${requestId}] Request Details:`)
    console.log(`[${requestId}]   Method: ${method}`)
    console.log(`[${requestId}]   URL: ${url}`)
    console.log(`[${requestId}]   Insecure SSL: ${insecureSSL ? 'YES (SSL verification disabled)' : 'NO'}`)
    console.log(`[${requestId}]   Headers:`, JSON.stringify(headers, null, 2))
    console.log(`[${requestId}]   Body: ${body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '(no body)'}`)

    // Validate required fields
    if (!url) {
      console.log(`[${requestId}] ERROR: URL is required`)
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!method) {
      console.log(`[${requestId}] ERROR: HTTP method is required`)
      return NextResponse.json({ error: "HTTP method is required" }, { status: 400 })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      console.log(`[${requestId}] URL validation: PASSED`)
    } catch {
      console.log(`[${requestId}] ERROR: Invalid URL format`)
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Resolve hostname to IP if it's a domain name
    const hostname = parsedUrl.hostname
    const isDirectIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(hostname)
    let resolvedUrl = url // Will be modified if we need to use a custom IP
    let customResolution = false
    
    if (isDirectIP) {
      console.log(`[${requestId}] Direct IP address detected: ${hostname}`)
    } else {
      console.log(`[${requestId}] Domain name detected: ${hostname}`)
      try {
        // Use the callback-based dns.lookup with promisify for better /etc/hosts support
        const dnsResult = await dnsLookup(hostname, { family: 0 }) // family: 0 means both IPv4 and IPv6
        console.log(`[${requestId}] DNS Resolution: ${hostname} -> ${dnsResult.address} (family: IPv${dnsResult.family})`)
      } catch (dnsError) {
        console.log(`[${requestId}] Primary DNS Resolution failed: ${dnsError instanceof Error ? dnsError.message : 'Unknown DNS error'}`)
        
        // Try alternative resolution methods
        try {
          // Try with explicit IPv4 family
          const ipv4Result = await dnsLookup(hostname, { family: 4 })
          console.log(`[${requestId}] IPv4 DNS Resolution: ${hostname} -> ${ipv4Result.address}`)
        } catch (ipv4Error) {
          console.log(`[${requestId}] IPv4 DNS Resolution also failed: ${ipv4Error instanceof Error ? ipv4Error.message : 'Unknown error'}`)
          
          // Try to use the direct dns/promises lookup as fallback
          try {
            const fallbackResult = await lookup(hostname)
            console.log(`[${requestId}] Fallback DNS Resolution: ${hostname} -> ${fallbackResult.address} (family: IPv${fallbackResult.family})`)
          } catch (fallbackError) {
            console.log(`[${requestId}] All DNS Resolution attempts failed`)
            console.log(`[${requestId}] Final error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`)
            
            // Check environment mappings first (higher priority)
            const envMapping = getEnvDnsMapping(hostname)
            // Check /etc/hosts as fallback
            const hostsEntry = await checkEtcHosts(hostname)
            
            if (envMapping) {
              console.log(`[${requestId}] Found in environment DNS mappings: ${hostname} -> ${envMapping}`)
              console.log(`[${requestId}] ✅ Using environment-configured DNS mapping for request`)
              // Replace the hostname in the URL with the resolved IP
              resolvedUrl = url.replace(hostname, envMapping)
              customResolution = true
            } else if (hostsEntry) {
              console.log(`[${requestId}] Found in /etc/hosts: ${hostname} -> ${hostsEntry}`)
              console.log(`[${requestId}] ✅ Using /etc/hosts entry for request`)
              // Replace the hostname in the URL with the resolved IP
              resolvedUrl = url.replace(hostname, hostsEntry)
              customResolution = true
            } else {
              console.log(`[${requestId}] Not found in /etc/hosts or environment mappings`)
              console.log(`[${requestId}] This may indicate:`)
              console.log(`[${requestId}] - Domain is not in /etc/hosts file`)
              console.log(`[${requestId}] - Domain is not configured in DNS_MAPPINGS environment variable`)
              console.log(`[${requestId}] - Domain is not resolvable via system DNS`)
              console.log(`[${requestId}] - Network connectivity issues`)
              console.log(`[${requestId}] Continuing with original hostname (request may fail)`)
            }
          }
        }
      }
    }
    
    if (customResolution) {
      console.log(`[${requestId}] Modified URL for custom resolution: ${url} -> ${resolvedUrl}`)
    }

    // Validate HTTP method
    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    if (!validMethods.includes(method.toUpperCase())) {
      console.log(`[${requestId}] ERROR: Invalid HTTP method: ${method}`)
      return NextResponse.json({ error: "Invalid HTTP method" }, { status: 400 })
    }

    console.log(`[${requestId}] HTTP method validation: PASSED`)

    // Prepare headers with defaults
    const requestHeaders: Record<string, string> = {
      "User-Agent": "HTTP-Client-Server/1.0",
      ...headers,
    }

    // If we're using custom resolution, add the original hostname as Host header
    if (customResolution) {
      requestHeaders["Host"] = hostname
      console.log(`[${requestId}] Added Host header for custom resolution: ${hostname}`)
    }

    console.log(`[${requestId}] Final request headers:`, JSON.stringify(requestHeaders, null, 2))

    // Handle different content types for body
    let requestBody: string | undefined
    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
      if (typeof body === "string") {
        requestBody = body
        console.log(`[${requestId}] Request body processed as string (${requestBody.length} chars)`)
      } else if (typeof body === "object") {
        requestBody = JSON.stringify(body)
        console.log(`[${requestId}] Request body processed as JSON (${requestBody.length} chars)`)
        // Set content-type if not already specified
        if (!requestHeaders["Content-Type"] && !requestHeaders["content-type"]) {
          requestHeaders["Content-Type"] = "application/json"
          console.log(`[${requestId}] Auto-set Content-Type to application/json`)
        }
      }
    } else {
      console.log(`[${requestId}] No request body (${method} method or no body provided)`)
    }

    console.log(`[${requestId}] Final request body: ${requestBody ? `"${requestBody}"` : '(none)'}`)

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    console.log(`[${requestId}] Starting HTTP request with 30s timeout...`)
    const startTime = Date.now()

    try {
      // Configure fetch options with SSL handling
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      }

      if (insecureSSL && resolvedUrl.startsWith('https://')) {
        console.log(`[${requestId}] Configuring INSECURE SSL mode (certificate verification disabled)`)
      } else if (resolvedUrl.startsWith('https://')) {
        console.log(`[${requestId}] Using secure SSL (certificate verification enabled)`)
      } else {
        console.log(`[${requestId}] HTTP request (no SSL)`)
      }

      console.log(`[${requestId}] ===== OUTGOING HTTP REQUEST =====`)
      console.log(`[${requestId}] Target: ${method.toUpperCase()} ${resolvedUrl}`)
      if (customResolution) {
        console.log(`[${requestId}] Original URL: ${url}`)
        console.log(`[${requestId}] Using custom DNS resolution: ${hostname} -> ${resolvedUrl.includes('://') ? new URL(resolvedUrl).hostname : 'IP'}`)
      }
      console.log(`[${requestId}] Fetch options:`, JSON.stringify({
        method: fetchOptions.method,
        headers: fetchOptions.headers,
        body: fetchOptions.body,
        insecureSSL: insecureSSL
      }, null, 2))

      // Make the request from the server using the resolved URL with our custom function
      const response = await makeRequest(resolvedUrl, {
        ...fetchOptions,
        insecureSSL: insecureSSL
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      console.log(`[${requestId}] ===== HTTP RESPONSE RECEIVED =====`)
      console.log(`[${requestId}] Response time: ${responseTime}ms`)
      console.log(`[${requestId}] Status: ${response.status} ${response.statusText}`)
      console.log(`[${requestId}] Final URL: ${response.url}`)
      console.log(`[${requestId}] Redirected: ${response.redirected}`)

      clearTimeout(timeoutId)

      // Get response headers as plain object
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      console.log(`[${requestId}] Response headers:`, JSON.stringify(responseHeaders, null, 2))

      // Get response body with proper handling for different content types
      let responseBody: string
      const contentType = response.headers.get("content-type") || ""
      console.log(`[${requestId}] Content-Type: ${contentType || '(none)'}`)

      if (contentType.includes("application/json")) {
        try {
          const jsonData = await response.json()
          responseBody = JSON.stringify(jsonData, null, 2)
          console.log(`[${requestId}] Response body parsed as JSON (${responseBody.length} chars)`)
        } catch {
          responseBody = await response.text()
          console.log(`[${requestId}] Failed to parse as JSON, using text (${responseBody.length} chars)`)
        }
      } else {
        responseBody = await response.text()
        console.log(`[${requestId}] Response body as text (${responseBody.length} chars)`)
      }

      console.log(`[${requestId}] ===== COMPLETE RESPONSE BODY =====`)
      console.log(`[${requestId}] Body content:\n${responseBody}`)
      console.log(`[${requestId}] ===== END RESPONSE BODY =====`)

      const finalResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url, // Final URL after redirects
        redirected: response.redirected,
      }

      console.log(`[${requestId}] ===== FINAL API RESPONSE =====`)
      console.log(`[${requestId}] Returning to client:`, JSON.stringify({
        ...finalResponse,
        body: `(${responseBody.length} chars) ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`
      }, null, 2))
      console.log(`[${requestId}] Request completed successfully in ${responseTime}ms`)

      return NextResponse.json(finalResponse)
    } catch (fetchError) {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      clearTimeout(timeoutId)

      console.log(`[${requestId}] ===== REQUEST FAILED =====`)
      console.log(`[${requestId}] Error occurred after ${responseTime}ms`)
      console.log(`[${requestId}] Error type: ${fetchError instanceof Error ? fetchError.constructor.name : 'Unknown'}`)
      console.log(`[${requestId}] Error message: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          console.log(`[${requestId}] Request timed out after 30 seconds`)
          const errorResponse = {
            status: 0,
            statusText: "Request Timeout",
            headers: {},
            body: "Request timed out after 30 seconds",
            url: url,
            redirected: false,
          }
          console.log(`[${requestId}] Returning timeout response to client`)
          return NextResponse.json(errorResponse)
        }

        console.log(`[${requestId}] Network error: ${fetchError.message}`)
        const errorResponse = {
          status: 0,
          statusText: "Network Error",
          headers: {},
          body: `Network error: ${fetchError.message}`,
          url: url,
          redirected: false,
        }
        console.log(`[${requestId}] Returning network error response to client`)
        return NextResponse.json(errorResponse)
      }

      console.log(`[${requestId}] Unknown error type, rethrowing`)
      throw fetchError
    }
  } catch (error) {
    console.log(`[${requestId}] ===== CRITICAL ERROR =====`)
    console.log(`[${requestId}] Critical error in proxy handler`)
    console.log(`[${requestId}] Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`)
    console.log(`[${requestId}] Error message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.log(`[${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available')
    console.error("Proxy request failed:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.log(`[${requestId}] JSON parsing error detected`)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    console.log(`[${requestId}] Returning 500 server error to client`)
    return NextResponse.json(
      {
        status: 0,
        statusText: "Server Error",
        headers: {},
        body: error instanceof Error ? error.message : "Unknown server error occurred",
        url: "",
        redirected: false,
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
