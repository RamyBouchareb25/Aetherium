import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { lookup } from "dns"

export async function POST(request: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    const { method, url, headers, body, insecureSSL, caCertificate } = await request.json()

    // Log incoming request
    console.log(`[${requestId}] ===== INCOMING REQUEST =====`)
    console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`)
    console.log(`[${requestId}] Client IP: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'}`)
    console.log(`[${requestId}] User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
    console.log(`[${requestId}] Request Details:`)
    console.log(`[${requestId}]   Method: ${method}`)
    console.log(`[${requestId}]   URL: ${url}`)
    console.log(`[${requestId}]   Insecure SSL: ${insecureSSL ? 'YES (SSL verification disabled)' : 'NO'}`)
    console.log(`[${requestId}]   Custom CA Certificate: ${caCertificate ? 'YES (Custom CA provided)' : 'NO'}`)
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
    
    if (isDirectIP) {
      console.log(`[${requestId}] Direct IP address detected: ${hostname}`)
    } else {
      console.log(`[${requestId}] Domain name detected: ${hostname}`)
      try {
        const dnsResult = await new Promise<{ address: string; family: number }>((resolve, reject) => {
          lookup(hostname, { all: false, family: 0 }, (err, address, family) => {
            if (err) {
              reject(err)
            } else {
              resolve({ address, family })
            }
          })
        })
        console.log(`[${requestId}] DNS Resolution: ${hostname} -> ${dnsResult.address} (family: IPv${dnsResult.family})`)
      } catch (dnsError) {
        console.log(`[${requestId}] DNS Resolution failed: ${dnsError instanceof Error ? dnsError.message : 'Unknown DNS error'}`)
        
        // Try alternative resolution methods
        console.log(`[${requestId}] Attempting alternative DNS resolution methods...`)
        
        try {
          // Try using the system's getaddrinfo more directly
          const alternativeResult = await new Promise<{ address: string; family: number }>((resolve, reject) => {
            lookup(hostname, (err, address, family) => {
              if (err) {
                reject(err)
              } else {
                resolve({ address, family })
              }
            })
          })
          console.log(`[${requestId}] Alternative DNS Resolution: ${hostname} -> ${alternativeResult.address} (family: IPv${alternativeResult.family})`)
        } catch (altError) {
          console.log(`[${requestId}] Alternative DNS Resolution also failed: ${altError instanceof Error ? altError.message : 'Unknown error'}`)
          console.log(`[${requestId}] Please check if '${hostname}' exists in /etc/hosts or is resolvable via DNS`)
          console.log(`[${requestId}] Continuing with request (DNS resolution is for logging only)`)
        }
      }
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

      // Handle SSL configuration for HTTPS requests
      if (url.startsWith('https://')) {
        if (insecureSSL) {
          console.log(`[${requestId}] Configuring INSECURE SSL mode (certificate verification disabled)`)
          // Create custom agent that ignores SSL certificate errors
          const agent = new https.Agent({
            rejectUnauthorized: false
          })
          
          // Add the agent to fetch options
          // @ts-expect-error - Node.js specific fetch options
          fetchOptions.agent = agent
        } else if (caCertificate) {
          console.log(`[${requestId}] Configuring SSL with custom CA certificate`)
          try {
            // Decode base64 certificate
            const caCertPem = Buffer.from(caCertificate, 'base64').toString('utf-8')
            
            // Validate certificate format
            if (!caCertPem.includes('BEGIN CERTIFICATE') && !caCertPem.includes('BEGIN TRUSTED CERTIFICATE')) {
              console.log(`[${requestId}] ERROR: Invalid CA certificate format`)
              return NextResponse.json({ error: "Invalid CA certificate format" }, { status: 400 })
            }

            // Create custom agent with CA certificate
            const agent = new https.Agent({
              ca: caCertPem,
              rejectUnauthorized: true
            })
            
            // Add the agent to fetch options
            // @ts-expect-error - Node.js specific fetch options
            fetchOptions.agent = agent
            
            console.log(`[${requestId}] Custom CA certificate configured successfully`)
          } catch (error) {
            console.log(`[${requestId}] ERROR: Failed to process CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`)
            return NextResponse.json({ error: "Failed to process CA certificate" }, { status: 400 })
          }
        } else {
          console.log(`[${requestId}] Using secure SSL (default certificate verification)`)
        }
      } else {
        console.log(`[${requestId}] HTTP request (no SSL)`)
      }

      console.log(`[${requestId}] ===== OUTGOING HTTP REQUEST =====`)
      console.log(`[${requestId}] Target: ${method.toUpperCase()} ${url}`)
      console.log(`[${requestId}] Fetch options:`, JSON.stringify({
        method: fetchOptions.method,
        headers: fetchOptions.headers,
        body: fetchOptions.body,
        hasCustomAgent: !!(fetchOptions as Record<string, unknown>).agent
      }, null, 2))

      // Make the request from the server
      const response = await fetch(url, fetchOptions)

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
