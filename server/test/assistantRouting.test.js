import test from 'node:test'
import assert from 'node:assert/strict'
import { isMarketplaceLookup,shouldUseAgent } from '../src/routes/assistant.routes.js'
import { normalizeAgentAction, normalizeIntentResult } from '../src/services/assistantService.js'

test('dữ liệu cá nhân và thao tác được chuyển tới Agent', () => {
  assert.equal(shouldUseAgent('bạn có thể xem ví tôi có bao nhiêu và nạp thêm 10k được k'), true)
  assert.equal(shouldUseAgent('số dư của tôi hiện tại là bao nhiêu?'), true)
  assert.equal(shouldUseAgent('Ví tôi còn bao nhiêu?'), true)
  assert.equal(shouldUseAgent('tìm giúp mình bài chia sẻ giải tích'), true)
  assert.equal(shouldUseAgent('tôi cần template CV cho ngành Data'), true)
  assert.equal(shouldUseAgent('xác nhat'), true)
})

test('nhu cầu marketplace không bị chuyển nhầm sang RAG',()=>{
  assert.equal(isMarketplaceLookup('tôi cần template CV cho ngành Data'),true)
  assert.equal(isMarketplaceLookup('có bộ checklist hồ sơ học bổng không'),true)
  assert.equal(isMarketplaceLookup('quy định chia sẻ dữ liệu là gì'),false)
})

test('câu hỏi kiến thức tĩnh ở lại RAG', () => {
  assert.equal(shouldUseAgent('cách nạp tiền vào ví là gì?'), false)
  assert.equal(shouldUseAgent('hướng dẫn đăng yêu cầu'), false)
  assert.equal(shouldUseAgent('phí nền tảng là bao nhiêu?'), false)
  assert.equal(shouldUseAgent('TLUCS thuộc lĩnh vực nào?'), false)
})

test('máy chủ chuẩn hóa tối mai theo múi giờ Việt Nam', () => {
  const action = normalizeAgentAction('create_request', { startsAt: '2026-09-06T20:00:00+07:00' }, 'trao đổi tầm 8h tối mai', { now: '2026-09-04T15:03:00.000Z' })
  assert.equal(action.startsAt, '2026-09-05T20:00:00+07:00')
  assert.equal(normalizeAgentAction('create_request', {}, 'tôi cần trao đổi ngắn', {}).durationMinutes, 30)
})

test('AI Intent Router chỉ trả route hợp lệ và không cấp quyền thực thi', () => {
  assert.deepEqual(normalizeIntentResult({ route: 'AGENT_READ', confidence: 1.4, reason: 'xem ví' }, 'groq:test'), { route: 'agent_read', confidence: 1, reason: 'xem ví', provider: 'groq:test' })
  assert.deepEqual(normalizeIntentResult({ route: 'confirm', confidence: .96, reason: 'chốt thao tác trước' }).route, 'confirm')
  assert.throws(() => normalizeIntentResult({ route: 'execute_now', confidence: 1 }))
})
