import { NextResponse } from "next/server";

function getUpstreamBaseUrl() {
  return process.env.NEXT_PUBLIC_WHAT_IF_MARKET_API_URL?.trim() ?? "";
}

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params;
  const base = getUpstreamBaseUrl();

  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_WHAT_IF_MARKET_API_URL is empty" },
      { status: 503 }
    );
  }

  const endpoint = `${base.replace(/\/+$/, "")}/${symbol}`;

  try {
    const upstream = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status} ${upstream.statusText}` },
        { status: upstream.status }
      );
    }

    const body = (await upstream.json()) as unknown;
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Proxy request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
