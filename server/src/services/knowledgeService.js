import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { database } from '../db/connection.js'
import { env } from '../config/env.js'
import { embedText, embeddingEnabled, vectorLiteral } from './embeddingService.js'

const here = dirname(fileURLToPath(import.meta.url))
const knowledgeDir = resolve(here, '../../../knowledge')
export const MIN_KNOWLEDGE_CONFIDENCE = 0.85
let cache
let expansionCache

export function normalizeKnowledgeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd')
}

const STOP_WORDS = new Set(['va','hay','cho','cua','voi','the','nao','toi','minh','ban','la','dang','lam','gi','bao','nhieu','co','khong','duoc','ve','sau','khi','cach'])
function tokens(value) { return [...new Set((normalizeKnowledgeText(value).match(/[a-z0-9]{2,}/g) || []).filter(token => !STOP_WORDS.has(token)))] }
function tokenSet(value) { return new Set(tokens(value)) }
function hasAnswerContent(chunk) { return chunk.content.split('\n').slice(1).join('\n').trim().length > 0 }

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { metadata: {}, body: text }
  const end = text.indexOf('\n---\n', 4)
  if (end < 0) return { metadata: {}, body: text }
  const metadata = {}
  for (const line of text.slice(4, end).split('\n')) {
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim(), raw = line.slice(separator + 1).trim()
    metadata[key] = raw.startsWith('[') ? raw.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean) : raw
  }
  return { metadata, body: text.slice(end + 5) }
}

export function chunksFromMarkdown(text, source) {
  const { metadata, body } = parseFrontmatter(text), chunks = [], hierarchy = []
  let current
  const flush = () => {
    if (!current) return
    const content = current.lines.join('\n').trim()
    if (content) chunks.push({ id: `${source}#${chunks.length + 1}`, source, title: current.title, hierarchy: current.hierarchy, level: current.level, domain: metadata.domain || 'general', universityId: metadata.university_id || null, riskLevel: metadata.risk_level || 'low', authority: metadata.authority || 'product_documentation', reviewedAt: metadata.reviewed_at || null, tags: Array.isArray(metadata.tags) ? metadata.tags : [], content })
  }
  for (const line of body.split('\n')) {
    const heading = line.match(/^(#{1,3})\s+(.+)/)
    if (!heading) { if (current) current.lines.push(line); continue }
    flush(); const level = heading[1].length; hierarchy[level - 1] = heading[2].trim(); hierarchy.length = level
    current = { title: heading[2].trim(), level, hierarchy: [...hierarchy], lines: [line] }
  }
  flush(); return chunks
}

async function load() {
  if (cache) return cache
  const files = (await readdir(knowledgeDir)).filter(file => file.endsWith('.md') && file !== 'README.md')
  cache = (await Promise.all(files.map(async source => chunksFromMarkdown(await readFile(resolve(knowledgeDir, source), 'utf8'), source)))).flat()
  return cache
}

export async function loadKnowledgeChunks() { return load() }

async function expansions() {
  if (!expansionCache) expansionCache = JSON.parse(await readFile(resolve(knowledgeDir, 'query-expansions.json'), 'utf8'))
  return expansionCache
}

function keywordSearch(query, chunks, config) {
  chunks = chunks.filter(hasAnswerContent)
  const normalized = normalizeKnowledgeText(query), directTokens = tokens(query)
  if (!directTokens.length) return []
  const activeGroups = config.groups.filter(group => group.terms.some(term => normalized.includes(normalizeKnowledgeText(term))))
  const hasIntentPhrase = activeGroups.some(group => group.terms.some(term => tokens(term).length >= 2 && normalized.includes(normalizeKnowledgeText(term))))
  const expandedTokens = new Set(directTokens)
  for (const group of activeGroups) tokens(group.terms.join(' ')).forEach(token => expandedTokens.add(token))
  return chunks.map(chunk => {
    const title = tokenSet(chunk.title), tags = tokenSet(chunk.tags.join(' ')), path = tokenSet(chunk.hierarchy.join(' ')), body = tokenSet(chunk.content)
    const all = new Set([...title, ...tags, ...path, ...body])
    const score = [...expandedTokens].reduce((sum, token) => sum + (title.has(token) ? 5 : 0) + (tags.has(token) ? 4 : 0) + (path.has(token) ? 2 : 0) + (body.has(token) ? 1 : 0), 0)
    const directMatches = directTokens.filter(token => all.has(token)).length
    const coverage = directMatches / directTokens.length
    const aligned = activeGroups.some(group => tokens(group.terms.join(' ')).some(token => all.has(token)))
    const titleDirect = directTokens.some(token => title.has(token))
    const confidence = Math.min(1, coverage * .4 + (hasIntentPhrase && aligned ? .6 : aligned ? .25 : 0) + (titleDirect ? .1 : 0))
    return { ...chunk, score, confidence: Number(confidence.toFixed(3)), retrievalMode: 'hybrid_json_keyword' }
  }).sort((a, b) => b.score - a.score)
}

async function vectorSearch(query, limit) {
  const db = database()
  if (!db || !embeddingEnabled()) return []
  try {
    const vector = await embedText(query)
    const result = await db.query(`select id,source,title,content,metadata,1-(embedding <=> $1::vector) similarity from knowledge_chunks where embedding_model=$2 and length(trim(regexp_replace(content,'^[^\\n]*',''))) > 0 order by embedding <=> $1::vector limit $3`, [vectorLiteral(vector), env.embeddingModel, limit])
    return result.rows.map(row => ({ id: row.id, source: row.source, title: row.title, content: row.content, hierarchy: row.metadata?.hierarchy || [], domain: row.metadata?.domain || 'general', universityId: row.metadata?.university_id || null, riskLevel: row.metadata?.risk_level || 'low', authority: row.metadata?.authority, reviewedAt: row.metadata?.reviewed_at, tags: row.metadata?.tags || [], similarity: Number(row.similarity), confidence: Number(row.similarity), retrievalMode: 'pgvector_cosine' }))
  } catch (error) {
    console.warn('Vector search unavailable, falling back to keyword:', error.message)
    return []
  }
}

export async function searchKnowledge(query, limit = 4) {
  const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 8)
  const [chunks, config] = await Promise.all([load(), expansions()])
  const keyword = keywordSearch(query, chunks, config)
  const vector = await vectorSearch(query, 20)
  const fused = new Map()
  keyword.slice(0, 20).forEach((item, rank) => fused.set(item.id, { ...item, rrf: 1 / (60 + rank + 1) }))
  vector.forEach((item, rank) => fused.set(item.id, { ...(fused.get(item.id) || item), similarity: item.similarity, confidence: Math.max(fused.get(item.id)?.confidence || 0, item.similarity), retrievalMode: fused.has(item.id) ? 'hybrid_rrf' : item.retrievalMode, rrf: (fused.get(item.id)?.rrf || 0) + 1 / (60 + rank + 1) }))
  return [...fused.values()].filter(item => item.confidence >= MIN_KNOWLEDGE_CONFIDENCE || item.similarity >= env.embeddingMinSimilarity).sort((a, b) => b.rrf - a.rrf || b.score - a.score).slice(0, safeLimit)
}

export async function getKnowledgeStats() {
  const chunks = await load()
  return { documents: new Set(chunks.map(x => x.source)).size, chunks: chunks.length, domains: [...new Set(chunks.map(x => x.domain))].sort() }
}

export async function answerFromKnowledge(query) {
  const [chunk] = await searchKnowledge(query, 1)
  if (!chunk) return { answer: 'Mình chưa biết câu trả lời từ kho tài liệu TLUCS hiện có.', confidence: 0, source: null }
  const paragraphs = chunk.content.split(/\n\s*\n/).slice(1).filter(part => !part.startsWith('## Nguồn'))
  return { answer: `${paragraphs.join('\n\n').trim().slice(0, 1000)}\n\nNguồn: [${chunk.source} > ${chunk.title}]`, confidence: chunk.confidence, source: chunk.source }
}
