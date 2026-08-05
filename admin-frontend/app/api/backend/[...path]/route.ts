import { NextRequest } from "next/server";

const BACKEND_BASE =
  (process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    "https://qtech-backend.vercel.app").replace(/\/$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, pathSegments: string[]) {
  try {
    const targetUrl = new URL(
      `${BACKEND_BASE}/${pathSegments.join("/")}${request.nextUrl.search}`
    );

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("origin");
    headers.delete("referer");
    headers.delete("content-length");

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const bodyText = await request.text();
      if (bodyText) {
        init.body = bodyText;
      }
    }

    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    return Response.json(
      {
        success: false,
        message,
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const result = await proxy(request, (await context.params).path);
  return new Response(null, {
    status: 204,
    headers: result.headers,
  });
}
