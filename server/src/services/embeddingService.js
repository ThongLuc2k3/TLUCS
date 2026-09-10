import { env } from '../config/env.js'

function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  return norm ? vector.map(value => value / norm) : vector
}

export function embeddingEnabled() {
  return env.embeddingProvider === 'gemini' && Boolean(env.geminiApiKey)
}

export async function embedText(text, taskType = 'RETRIEVAL_QUERY') {
  if (!embeddingEnabled()) return null
  if (env.embeddingDim !== 768) throw new Error('TLUCS hiện lưu embedding vector(768); EMBEDDING_DIM phải bằng 768.')
  const model = env.embeddingModel.replace(/^models\//, '')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(env.geminiApiKey)}`
  const response = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text: String(text).slice(0, 12000) }] }, taskType, outputDimensionality: env.embeddingDim }),
  })
  if (!response.ok) throw new Error(`Gemini embedding lỗi ${response.status}: ${(await response.text()).slice(0, 300)}`)
  const vector = (await response.json())?.embedding?.values
  if (!Array.isArray(vector) || vector.length !== env.embeddingDim) throw new Error('Gemini trả về vector không đúng kích thước.')
  return normalize(vector)
}

export function vectorLiteral(vector) { return `[${vector.map(Number).join(',')}]` }
