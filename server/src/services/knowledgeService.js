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

function keywordSearch(query, chunks, config, context = {}) {
  chunks = chunks.filter(chunk=>hasAnswerContent(chunk)&&(!context.universityCode||!chunk.universityId||normalizeKnowledgeText(chunk.universityId)===normalizeKnowledgeText(context.universityCode)))
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

async function vectorSearch(query, limit, context = {}) {
  const db = database()
  if (!db || !embeddingEnabled()) return []
  try {
    const vector = await embedText(query)
    const result = await db.query(`select id,source,title,content,metadata,document_id,contributor_id,visibility,1-(embedding <=> $1::vector) similarity from knowledge_chunks where embedding_model=$2 and length(trim(regexp_replace(content,'^[^\\n]*',''))) > 0 and (expires_at is null or expires_at>now()) and visibility in ('public','paid_preview') and ($4::uuid is null or (document_id is not null and metadata->>'university_id'=$4::text) or (document_id is null and (metadata->>'university_id' is null or lower(metadata->>'university_id')=(select lower(code) from universities where id=$4)))) and ($5::uuid is null or document_id is null or metadata->>'faculty_id'=$5::text) and ($6::uuid is null or document_id is null or metadata->>'course_id'=$6::text) order by embedding <=> $1::vector limit $3`, [vectorLiteral(vector), env.embeddingModel, limit, context.universityId||null,context.facultyId||null,context.courseId||null])
    return result.rows.map(row => ({ id: row.id, source: row.source, title: row.title, content: row.content, document_id:row.document_id, contributor_id:row.contributor_id, visibility:row.visibility, hierarchy: row.metadata?.hierarchy || [], domain: row.metadata?.domain || 'general', universityId: row.metadata?.university_id || null, riskLevel: row.metadata?.risk_level || 'low', authority: row.metadata?.authority, reviewedAt: row.metadata?.reviewed_at, tags: row.metadata?.tags || [], similarity: Number(row.similarity), confidence: Number(row.similarity), retrievalMode: 'pgvector_cosine' }))
  } catch (error) {
    console.warn('Vector search unavailable, falling back to keyword:', error.message)
    return []
  }
}

function calibratedConfidence(item) {
  if (item.confidence >= MIN_KNOWLEDGE_CONFIDENCE) return item.confidence
  if (!Number.isFinite(item.similarity)) return item.confidence || 0
  return Math.min(.99, Math.max(0, .52 + item.similarity * .58 + (item.retrievalMode === 'hybrid_rrf' ? .04 : 0)))
}

export async function searchKnowledge(query, limit = 4, context = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 8)
  const [chunks, config] = await Promise.all([load(), expansions()])
  if(context.universityId&&!context.universityCode){const db=database();if(db)context={...context,universityCode:(await db.query('select code from universities where id=$1',[context.universityId])).rows[0]?.code}}
  const keyword = keywordSearch(query, chunks, config, context)
  const vector = await vectorSearch(query, 20, context)
  const fused = new Map()
  keyword.slice(0, 20).forEach((item, rank) => fused.set(item.id, { ...item, rrf: 1 / (60 + rank + 1) }))
  vector.forEach((item, rank) => fused.set(item.id, { ...(fused.get(item.id) || item), similarity: item.similarity, confidence: Math.max(fused.get(item.id)?.confidence || 0, item.similarity), retrievalMode: fused.has(item.id) ? 'hybrid_rrf' : item.retrievalMode, rrf: (fused.get(item.id)?.rrf || 0) + 4 / (60 + rank + 1) }))
  return [...fused.values()].map(item=>({...item,confidence:Number(calibratedConfidence(item).toFixed(3))})).filter(item => item.confidence >= MIN_KNOWLEDGE_CONFIDENCE).sort((a, b) => b.rrf - a.rrf || b.score - a.score).slice(0, safeLimit)
}

export async function getKnowledgeStats() {
  const chunks = await load()
  return { documents: new Set(chunks.map(x => x.source)).size, chunks: chunks.length, domains: [...new Set(chunks.map(x => x.domain))].sort() }
}

async function synthesize(query,chunks){
  const evidence=chunks.map((c,i)=>`[${i+1}] ${c.source} > ${c.title}${c.visibility==='paid_preview'?' (chỉ là bản xem trước; phải nói rõ cần mở khóa để xem toàn văn)':''}\n${c.content.replace(/^#{1,3}[^\n]*\n?/,'').slice(0,2400)}`).join('\n\n')
  const instruction=`Chỉ trả lời câu hỏi bằng chứng cứ bên dưới. Không thêm kiến thức ngoài. Viết tiếng Việt tự nhiên, ngắn gọn. Mỗi ý phải trích [số]. Không đủ dữ liệu thì nói chưa biết.\nCâu hỏi: ${query}\n\nBằng chứng:\n${evidence}`
  const cleanOutput=value=>{const text=String(value||'').trim();if(!text)return null;if(text.includes('</think>'))return text.split('</think>').at(-1).trim();if(/^<think>/i.test(text))return null;return text}
  try{
    if(env.geminiApiKey){const model=encodeURIComponent(env.geminiModel.replace(/^models\//,'')),response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction}]}],generationConfig:{temperature:0,maxOutputTokens:900}}),signal:AbortSignal.timeout(30000)});if(response.ok){const output=cleanOutput((await response.json()).candidates?.[0]?.content?.parts?.map(p=>p.text||'').join(''));if(output)return output}}
    if(env.groqApiKey){const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.groqApiKey}`},body:JSON.stringify({model:env.groqModel,messages:[{role:'system',content:'Bạn là bộ soạn RAG có căn cứ. Chỉ in câu trả lời cuối, tuyệt đối không in suy luận hay thẻ think.'},{role:'user',content:instruction}],temperature:0,max_completion_tokens:700}),signal:AbortSignal.timeout(30000)});if(response.ok){const output=cleanOutput((await response.json()).choices?.[0]?.message?.content);if(output)return output}}
  }catch(error){console.warn('RAG synthesis fallback:',error.message)}
  return null
}

async function recordQuery(query,chunks,context){const db=database();if(!db)return null;const top=chunks[0];const row=(await db.query(`insert into knowledge_queries(user_id,query,university_id,faculty_id,course_id,top_confidence,matched) values($1,$2,$3,$4,$5,$6,$7) returning id`,[context.userId||null,query,context.universityId||null,context.facultyId||null,context.courseId||null,top?.confidence||0,Boolean(top)])).rows[0];if(top){for(const chunk of chunks)await db.query(`insert into knowledge_citations(query_id,chunk_id,document_id,contributor_id) values($1,$2,$3,$4)`,[row.id,chunk.id,chunk.document_id||null,chunk.contributor_id||null])}else{const normalized=normalizeKnowledgeText(query).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);const old=(await db.query(`select id from knowledge_gaps where normalized_query=$1 and university_id is not distinct from $2 and faculty_id is not distinct from $3 and course_id is not distinct from $4`,[normalized,context.universityId||null,context.facultyId||null,context.courseId||null])).rows[0];if(old)await db.query(`update knowledge_gaps set occurrences=occurrences+1,last_asked_at=now(),example_query=$2 where id=$1`,[old.id,query]);else await db.query(`insert into knowledge_gaps(normalized_query,example_query,university_id,faculty_id,course_id) values($1,$2,$3,$4,$5)`,[normalized,query,context.universityId||null,context.facultyId||null,context.courseId||null])}return row.id}

export async function answerFromKnowledge(query, context = {}) {
  const chunks = await searchKnowledge(query, 5, context), chunk=chunks[0]
  if (!chunk){const queryId=await recordQuery(query,[],context);return { answer: 'Mình chưa biết câu trả lời từ kho hiện có. Bạn có thể đăng câu hỏi lên diễn đàn hoặc tạo một yêu cầu để tìm người đã có trải nghiệm phù hợp.', confidence: 0, source: null, matched: false, queryId, suggestedActions:['create_forum_post','create_request'] }}
  const generated=await synthesize(query,chunks)
  const fallback=chunk.content.split('\n').slice(1).join('\n').replace(/\n## Nguồn[\s\S]*$/i, '').trim().slice(0,1000)
  const cited=[...new Set([...(generated||'').matchAll(/\[(\d+)\]/g)].map(match=>Number(match[1])-1))].filter(i=>chunks[i])
  const selected=(cited.length?cited:[0]).map(i=>chunks[i]),queryId=await recordQuery(query,selected,context)
  const sources=selected.map((item,i)=>`[${cited.length?cited[i]+1:1}] ${item.source} > ${item.title}`).join('\n')
  return { answer: `${generated||fallback}\n\nNguồn:\n${sources}`, confidence: chunk.confidence, source: chunk.source, sources:selected.map(c=>({source:c.source,title:c.title,confidence:c.confidence})), matched: true, queryId, retrievalMode: chunk.retrievalMode }
}
