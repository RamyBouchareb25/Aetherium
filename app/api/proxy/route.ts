import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { method, url, headers, body } = await request.json()

    // Validate required fields
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!method) {
      return NextResponse.json({ error: "HTTP method is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Validate HTTP method
    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    if (!validMethods.includes(method.toUpperCase())) {
      return NextResponse.json({ error: "Invalid HTTP method" }, { status: 400 })
    }

    // Prepare headers with defaults
    const requestHeaders: Record<string, string> = {
      "User-Agent": "HTTP-Client-Server/1.0",
      ...headers,
    }

    // Handle different content types for body
    let requestBody: string | undefined
    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
      if (typeof body === "string") {
        requestBody = body
      } else if (typeof body === "object") {
        requestBody = JSON.stringify(body)
        // Set content-type if not already specified
        if (!requestHeaders["Content-Type"] && !requestHeaders["content-type"]) {
          requestHeaders["Content-Type"] = "application/json"
        }
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      // Make the request from the server
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Get response headers as plain object
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // Get response body with proper handling for different content types
      let responseBody: string
      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("application/json")) {
        try {
          const jsonData = await response.json()
          responseBody = JSON.stringify(jsonData, null, 2)
        } catch {
          responseBody = await response.text()
        }
      } else {
        responseBody = await response.text()
      }

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url, // Final URL after redirects
        redirected: response.redirected,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json({
            status: 0,
            statusText: "Request Timeout",
            headers: {},
            body: "Request timed out after 30 seconds",
            url: url,
            redirected: false,
          })
        }

        return NextResponse.json({
          status: 0,
          statusText: "Network Error",
          headers: {},
          body: `Network error: ${fetchError.message}`,
          url: url,
          redirected: false,
        })
      }

      throw fetchError
    }
  } catch (error) {
    console.error("Proxy request failed:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

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
