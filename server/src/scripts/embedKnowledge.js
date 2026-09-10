import { createHash } from 'node:crypto'
import { database } from '../db/connection.js'
import { env } from '../config/env.js'
import { embedText, embeddingEnabled, vectorLiteral } from '../services/embeddingService.js'
import { loadKnowledgeChunks } from '../services/knowledgeService.js'

const db = database()
if (!db) throw new Error('Thiếu DATABASE_URL')
if (!embeddingEnabled()) throw new Error('Cần GEMINI_API_KEY và EMBEDDING_PROVIDER=gemini')
const chunks = await loadKnowledgeChunks()
let embedded = 0, skipped = 0
for (const chunk of chunks) {
  const hash = createHash('sha256').update(`${env.embeddingModel}\n${chunk.title}\n${chunk.content}`).digest('hex')
  const old = await db.query('select 1 from knowledge_chunks where id=$1 and content_hash=$2 and embedding_model=$3', [chunk.id, hash, env.embeddingModel])
  if (old.rowCount) { skipped++; continue }
  const vector = await embedText(`${chunk.hierarchy.join(' > ')}\n${chunk.content}`, 'RETRIEVAL_DOCUMENT')
  const metadata = { hierarchy: chunk.hierarchy, domain: chunk.domain, university_id: chunk.universityId, risk_level: chunk.riskLevel, authority: chunk.authority, reviewed_at: chunk.reviewedAt, tags: chunk.tags }
  await db.query(`insert into knowledge_chunks(id,source,title,content,metadata,content_hash,embedding,embedding_model,embedded_at) values($1,$2,$3,$4,$5,$6,$7::vector,$8,now()) on conflict(id) do update set source=excluded.source,title=excluded.title,content=excluded.content,metadata=excluded.metadata,content_hash=excluded.content_hash,embedding=excluded.embedding,embedding_model=excluded.embedding_model,embedded_at=now()`, [chunk.id, chunk.source, chunk.title, chunk.content, metadata, hash, vectorLiteral(vector), env.embeddingModel])
  embedded++; console.log(`Embedded ${embedded}/${chunks.length}: ${chunk.id}`)
}
console.log(`Hoàn tất: ${embedded} chunk mới/đổi, ${skipped} chunk giữ nguyên.`)
await db.end()
