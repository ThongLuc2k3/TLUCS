import test from 'node:test'
import assert from 'node:assert/strict'
import { MIN_KNOWLEDGE_CONFIDENCE, answerFromKnowledge, getKnowledgeStats, searchKnowledge } from '../src/services/knowledgeService.js'

test('kho TLUCS có tài liệu phân cấp theo miền', async () => {
  const stats = await getKnowledgeStats()
  assert.ok(stats.documents >= 8)
  assert.ok(stats.chunks >= 40)
  assert.ok(stats.domains.includes('platform'))
  assert.ok(stats.domains.includes('safety'))
})

test('RAG chỉ trả kết quả đạt ngưỡng 85%', async () => {
  const results = await searchKnowledge('trang web này làm về lĩnh vực nào')
  assert.ok(results.length > 0)
  assert.ok(results.every(item => item.confidence >= MIN_KNOWLEDGE_CONFIDENCE))
  assert.equal(results[0].source, 'platform-overview.md')
})

test('RAG nói không biết khi không có tài liệu đủ khớp', async () => {
  const result = await answerFromKnowledge('xyz con mèo ngoài sao hỏa')
  assert.equal(result.confidence, 0)
  assert.match(result.answer, /chưa biết/)
})

test('kho HCMUS có metadata và trả chunk có nội dung', async () => {
  const results = await searchKnowledge('thư viện HCMUS ở đâu')
  assert.ok(results.length > 0)
  assert.ok(results.every(item => item.universityId === 'hcmus'))
  assert.ok(results.some(item => /Nguyễn Văn Cừ|Khu đô thị/.test(item.content)))
})

test('câu trả lời RAG giữ nội dung sau heading thay vì chỉ còn nguồn', async () => {
  const result = await answerFromKnowledge('học phí 2026-2027 nhóm Toán Dữ liệu và Máy tính là bao nhiêu')
  assert.equal(result.matched, true)
  assert.match(result.answer, /40,5 triệu đồng\/năm/)
  assert.match(result.answer, /Nguồn:/)
})
