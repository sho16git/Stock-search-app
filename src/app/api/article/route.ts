import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { Agent, fetch as undiciFetch } from "undici";
import { translateToJa } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Yahoo Finance responds with very large response headers (CSP etc.) that
// exceed Node's default 16KB limit, causing HeadersOverflowError.
const dispatcher = new Agent({
  headersTimeout: 30_000,
  bodyTimeout: 60_000,
  maxResponseSize: 10 * 1024 * 1024,
  maxHeaderSize: 128 * 1024,
});

const CACHE = new Map<string, ArticleResult>();
const MAX_CACHE = 100;

type ArticleResult = {
  ok: boolean;
  title: string | null;
  titleJa: string | null;
  body: string | null;
  bodyJa: string | null;
  author: string | null;
  publishedAt: string | null;
  image: string | null;
  source: string | null;
  url: string;
  error?: string;
};

function setCache(key: string, val: ArticleResult) {
  if (CACHE.size >= MAX_CACHE) {
    const first = CACHE.keys().next().value;
    if (first !== undefined) CACHE.delete(first);
  }
  CACHE.set(key, val);
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

type Extracted = Omit<ArticleResult, "titleJa" | "bodyJa">;

function extractJsonLd(html: string): {
  articleBody?: string;
  description?: string;
  headline?: string;
  datePublished?: string;
  author?: string;
} | null {
  // Match <script type="application/ld+json"> ... </script>
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const txt = m[1].trim();
      const parsed = JSON.parse(txt);
      const candidates = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];
      for (const c of candidates) {
        const t = c?.["@type"];
        const isArticle =
          t === "NewsArticle" ||
          t === "Article" ||
          (Array.isArray(t) &&
            t.some(
              (x: string) => x === "NewsArticle" || x === "Article",
            ));
        if (isArticle) {
          return {
            articleBody:
              typeof c.articleBody === "string" ? c.articleBody : undefined,
            description:
              typeof c.description === "string" ? c.description : undefined,
            headline:
              typeof c.headline === "string" ? c.headline : undefined,
            datePublished:
              typeof c.datePublished === "string" ? c.datePublished : undefined,
            author:
              typeof c.author === "string"
                ? c.author
                : typeof c.author?.name === "string"
                  ? c.author.name
                  : undefined,
          };
        }
      }
    } catch {
      /* not JSON or schema we recognise — skip */
    }
  }
  return null;
}

function extractArticle(html: string, url: string): Extracted {
  const $ = cheerio.load(html);

  // Title (prefer og:title)
  const title =
    cleanText($('meta[property="og:title"]').attr("content") || "") ||
    cleanText($("h1").first().text() || "") ||
    cleanText($("title").text() || "") ||
    null;

  // Image
  const image =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    null;

  // Source / publisher
  const source =
    cleanText($('meta[property="og:site_name"]').attr("content") || "") ||
    new URL(url).hostname.replace(/^www\./, "") ||
    null;

  // Try JSON-LD first (most reliable for SPA-rendered sites like Yahoo Finance)
  const jsonLd = extractJsonLd(html);

  let body: string | null = null;
  if (jsonLd?.articleBody && jsonLd.articleBody.length > 100) {
    body = jsonLd.articleBody;
  }

  // og:description as fallback / supplement
  const ogDesc = cleanText(
    $('meta[property="og:description"]').attr("content") || "",
  );

  // If JSON-LD doesn't give body, try HTML extraction
  if (!body) {
    const selectors = [
      "article .caas-body",
      ".caas-body",
      "article",
      '[data-test-locator="lead-stage-body"]',
      ".article-body",
      ".article__body",
      ".story-body",
      ".post-content",
      ".entry-content",
      "main",
    ];
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length === 0) continue;
      const paragraphs = el
        .find("p")
        .map((_, p) => cleanText($(p).text()))
        .get()
        .filter((t) => t.length > 30);
      if (paragraphs.length >= 2) {
        body = paragraphs.slice(0, 25).join("\n\n");
        break;
      }
    }
  }

  // Final fallback: og:description + JSON-LD description (summary)
  if (!body) {
    const parts: string[] = [];
    if (jsonLd?.description && jsonLd.description.length > 50) {
      parts.push(jsonLd.description);
    } else if (ogDesc && ogDesc.length > 50) {
      parts.push(ogDesc);
    }
    if (parts.length > 0) body = parts.join("\n\n");
  }

  // Author
  const author =
    jsonLd?.author ||
    cleanText($('meta[name="author"]').attr("content") || "") ||
    cleanText($('meta[property="article:author"]').attr("content") || "") ||
    null;

  // Published date
  const publishedAt =
    jsonLd?.datePublished ||
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="pubdate"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    null;

  return {
    ok: !!body,
    title,
    body,
    author: author ?? null,
    publishedAt: publishedAt ?? null,
    image: image ?? null,
    source: source ?? null,
    url,
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (CACHE.has(url)) {
    return NextResponse.json(CACHE.get(url));
  }

  try {
    const res = await undiciFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.7",
      },
      redirect: "follow",
      dispatcher,
    });
    if (!res.ok) {
      const result: ArticleResult = {
        ok: false,
        title: null,
        titleJa: null,
        body: null,
        bodyJa: null,
        author: null,
        publishedAt: null,
        image: null,
        source: null,
        url,
        error: `HTTP ${res.status}`,
      };
      return NextResponse.json(result, { status: 200 });
    }
    const html = await res.text();
    console.log(`[article] fetched ${url} len=${html.length}`);
    const extracted = extractArticle(html, url);
    console.log(
      `[article] extracted ok=${extracted.ok} title=${extracted.title?.slice(0, 40)} bodyLen=${extracted.body?.length ?? 0}`,
    );

    const [titleJa, bodyJa] = await Promise.all([
      translateToJa(extracted.title, { timeoutMs: 25_000 }),
      translateToJa(extracted.body, { timeoutMs: 40_000 }),
    ]);

    const result: ArticleResult = {
      ...extracted,
      titleJa,
      bodyJa,
    };
    setCache(url, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[article] fetch error", url, err);
    const errCause =
      err instanceof Error && "cause" in err
        ? String((err as { cause?: unknown }).cause)
        : undefined;
    const result: ArticleResult = {
      ok: false,
      title: null,
      titleJa: null,
      body: null,
      bodyJa: null,
      author: null,
      publishedAt: null,
      image: null,
      source: null,
      url,
      error:
        (err instanceof Error ? err.message : "fetch failed") +
        (errCause ? ` (${errCause})` : ""),
    };
    return NextResponse.json(result, { status: 200 });
  }
}
