import type { VercelRequest, VercelResponse } from '@vercel/node'
// The project is ESM ("type": "module"), so Vercel loads this function as native
// ESM. A JSON import therefore requires an import attribute, or Node throws
// ERR_IMPORT_ATTRIBUTE_MISSING at load time (crashing the function 100%).
import data from '../public/dashboard_data.json' with { type: 'json' }
// Native ESM requires explicit .js extensions on relative imports (the compiled
// output is .js), or Node throws ERR_MODULE_NOT_FOUND at load time.
import { getChartContext } from './lib/chartContext.js'
import { computeFacts } from './lib/analytics.js'
import { buildMessages, callProvider, env } from './lib/provider.js'

// POST /api/assistant { visualizationId, question }
// Graceful error handling per plan §53: the client is NEVER shown a raw status
// code. Every failure maps to a short, deterministic, calm `limitation` string.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      limitation: "I'm set up to answer questions, not other request types. Please ask me about a chart.",
    })
  }

  // 1. Validate input shape.
  const body = (req.body ?? {}) as { visualizationId?: unknown; question?: unknown }
  const vizId = typeof body.visualizationId === 'string' ? body.visualizationId.trim() : ''
  const question = typeof body.question === 'string' ? body.question.trim() : ''

  if (!question) {
    // 400 semantics, mapped to friendly copy.
    return res.status(200).json({ status: 'rejected', limitation: 'I did not quite get that. Try a short question about this chart.' })
  }
  if (question.length > 500) {
    return res.status(200).json({ status: 'rejected', limitation: 'That question is a bit long. Try a shorter one about this chart.' })
  }

  // 2. Register-scoped chartId. A browser can never pass an arbitrary id or
  //    inject data - the chart must exist in OUR registry.
  const entry = getChartContext(vizId)
  if (!entry) {
    return res.status(403).json({ status: 'error', limitation: "I can't open that visualization. Please select a chart on the dashboard and try again." })
  }

  // 3. Rate limit (simple in-memory per IP token bucket). 10/min per IP.
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (!allow(ip)) {
    return res.status(429).json({ status: 'error', limitation: "I've answered a lot of questions just now. Please wait a moment and try again." })
  }

  // 4. Deterministic analytics first.
  const facts = computeFacts(entry.dataset, data as Record<string, unknown>)

  // 5. No LLM configured -> degrade to deterministic only (never an error).
  if (!env()) {
    const answer = pickAnswer(entry.dataset, facts, question)
    return res.status(200).json({
      status: 'success',
      answer: answer || "That's outside what this chart's data can tell me. I can answer about this chart's values, trends, rankings, comparisons, or its source.",
      evidence: [
        ...(facts.value ? [{ type: 'calculated' as const, text: facts.value }] : []),
        ...(facts.trend ? [{ type: 'calculated' as const, text: facts.trend }] : []),
        ...(facts.comparison ? [{ type: 'calculated' as const, text: facts.comparison }] : []),
      ],
    })
  }

  // 6. Call the LLM with a scoped, injection-safe prompt.
  const messages = buildMessages(entry, facts, question)
  const answer = await callProvider(messages)
  if (!answer) {
    return res.status(200).json({ status: 'error', limitation: "I couldn't analyse this chart right now. Please try again." })
  }

  return res.status(200).json({
    status: 'success',
    answer,
    evidence: [
      ...(facts.value ? [{ type: 'calculated' as const, text: facts.value }] : []),
      ...(facts.trend ? [{ type: 'calculated' as const, text: facts.trend }] : []),
      ...(facts.comparison ? [{ type: 'calculated' as const, text: facts.comparison }] : []),
    ],
  })
  } catch (err) {
    // Last-resort guard: any unexpected error still returns calm JSON (never a
    // stack trace or raw 500), so the browser shows friendly copy / offline mode.
    console.error('[assistant] unexpected handler error:', err instanceof Error ? err.message : String(err))
    return res.status(200).json({ status: 'error', limitation: "I couldn't analyse this chart right now. Please try again." })
  }
}

// Simple deterministic intent -> facts pick, used when no LLM is configured.
function pickAnswer(dataset: string, facts: { value: string | null; trend: string | null; source: string | null; top: string | null; bottom: string | null; comparison: string | null }, q: string): string | null {
  // Honest refusal: causal / normative questions are outside what a
  // deterministic answerer can assert. Never force an irrelevant value onto them.
  if (/\b(why|who caused|what caused|because|the reason|cause|recommend|should|ought|fix|advise|blame)\b/i.test(q)) {
    return "This chart shows what the data records, not why it happened. I can describe this chart's values, trends, rankings, comparisons, or its source, but I can't infer causes or give recommendations."
  }
  if (dataset === 'arrivals' && /\b(top|largest|biggest|most|share|highest)\b/i.test(q)) return facts.top
  if (/\b(source|where .* from|origin|methodology|method|basis)\b/i.test(q)) return facts.source
  if (/\b(trend|over time|how has|how did|change|recover)\b/i.test(q)) return facts.trend
  if (/\b(top|highest|largest|biggest)\b/i.test(q)) return facts.top
  if (/\b(bottom|lowest|smallest|weakest)\b/i.test(q)) return facts.bottom
  if (/\b(compare|versus|vs|relative|than)\b/i.test(q)) return facts.comparison
  return facts.value || facts.trend || facts.source
}

// In-memory per-IP rate limiter. resets each minute; not persistent across
// warm starts but sufficient to deter abuse at demo scale (plan §53.2).
const windowMs = 60_000
const hits = new Map<string, { count: number; reset: number }>()
function allow(ip: string): boolean {
  const now = Date.now()
  // Opportunistically drop expired entries so the map can't grow unbounded on a
  // long-lived warm serverless instance.
  if (hits.size > 512) {
    for (const [k, v] of hits) if (now > v.reset) hits.delete(k)
  }
  const rec = hits.get(ip)
  if (!rec || now > rec.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs })
    return true
  }
  rec.count += 1
  return rec.count <= 10
}