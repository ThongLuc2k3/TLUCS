import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { classifyAssistantIntent, planAgent } from '../services/assistantService.js'
import { requireAuth } from '../middleware/auth.js'
import { getUser } from '../services/authService.js'
import { answerFromKnowledge } from '../services/knowledgeService.js'
import { executeSignedAssistantAction, isNaturalAssistantConfirmation, signAssistantAction } from '../services/pendingAssistantActionService.js'

const router = Router()
const aiLimiter = rateLimit({ windowMs: 5 * 60 * 1000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'AI_RATE_LIMITED', message: 'Bạn đang thao tác với trợ lý AI quá nhanh. Vui lòng thử lại sau ít phút.' } } })
const greetingPattern = /^\s*(xin chào|chào|hello|hi|hey|alo)[!.?\s]*$/i
const greeting = 'Chào bạn! Mình là Agent TLUCS. Bạn có thể hỏi kiến thức hoặc nhờ mình tra cứu và thao tác các chức năng ngay trong chat.'

function normalizeIntent(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9%]+/g, ' ').trim()
}

export function shouldUseAgent(message) {
  const text = normalizeIntent(message)
  const staticQuestion = /^(cach|lam sao|huong dan|tai sao|vi sao|la gi|quy dinh|chinh sach) /.test(text)
  const personalData = /(cua toi|cua minh|vi toi|vi minh|so du|bao nhieu tien|lich su|thong bao cua|ho so cua|yeu cau cua|bai cua|phien cua|tin nhan cua)/.test(text)
  const operation = /(dang|tao|nhan|chon|tham gia|mo khoa|xac nhan|xac nhat|huy|cap nhat|doi|nap|rut|thanh toan|giai ngan|check in|hoan tat|danh gia|bao cao|khieu nai|tranh chap|binh luan|tha|luu|theo doi|tang|gui|nhan tin|moi|chap nhan|tu choi|de xuat|xac minh|tim|tra cuu|xem|liet ke)/.test(text)
  const requestCue = /^(dang|tao|nhan|chon|tham gia|mo khoa|xac nhan|xac nhat|huy|cap nhat|doi|nap|rut|thanh toan|giai ngan|check in|hoan tat|danh gia|bao cao|khieu nai|tranh chap|binh luan|tha|luu|theo doi|tang|gui|nhan tin|moi|chap nhan|tu choi|de xuat|xac minh|tim|tra cuu|xem|liet ke)( |$)|(toi can|minh can|toi muon|minh muon|co the|hay |giup toi|giup minh|dum|ho toi|cho toi|duoc khong|duoc k)/.test(text)
  return personalData || isMarketplaceLookup(message) || (!staticQuestion && operation && requestCue)
}

export function isMarketplaceLookup(message){const text=normalizeIntent(message),entity=/(template|cv|checklist|slide|tai lieu|bai chia se|bo de|lo trinh|buoi chia se|noi dung chia se|yeu cau ho tro)/.test(text),lookup=/(toi can|minh can|can tim|muon tim|tim|kiem|co .* khong|mo khoa|xem|goi y)/.test(text);return entity&&lookup}

router.post('/chat', aiLimiter, async (req, res, next) => {
  try {
    const message = String(req.body.message || '')
    if (greetingPattern.test(message)) return res.json({ data: { answer: greeting, mode: 'script' } })
    const intent = isMarketplaceLookup(message)?{route:'agent_read',confidence:1,reason:'Tìm dữ liệu marketplace',provider:'rule:marketplace'}:await classifyAssistantIntent(message, req.body.history)
    const needsAgent = intent ? ['agent_read', 'agent_write', 'confirm', 'clarify'].includes(intent.route) : shouldUseAgent(message)
    if (needsAgent) return res.json({ data: { answer: 'Đây là yêu cầu cần Agent truy cập dữ liệu hoặc hiểu thêm ngữ cảnh. Bạn hãy đăng nhập TLUCS rồi gửi lại; mọi thao tác thay đổi vẫn phải được xác nhận.', mode: 'auth_required', intent } })
    const knowledge = await answerFromKnowledge(message,{universityId:req.body.universityId||null})
    res.json({ data: { answer: knowledge.answer, mode: 'rag', confidence: knowledge.confidence, source: knowledge.source, sources:knowledge.sources, matched: knowledge.matched, queryId:knowledge.queryId, suggestedActions:knowledge.suggestedActions, retrievalMode: knowledge.retrievalMode, intent } })
  } catch (error) { next(error) }
})

router.post('/agent', aiLimiter, requireAuth, async (req, res, next) => {
  try {
    const message = String(req.body.message || '')
    if (greetingPattern.test(message)) return res.json({ data: { reply: greeting, action: null, toolsUsed: [], steps: 0, mode: 'script' } })
    const intent = isMarketplaceLookup(message)?{route:'agent_read',confidence:1,reason:'Tìm dữ liệu marketplace',provider:'rule:marketplace'}:await classifyAssistantIntent(message, req.body.history)
    const needsAgent = intent ? ['agent_read', 'agent_write', 'confirm', 'clarify'].includes(intent.route) : shouldUseAgent(message)
    if (!needsAgent) {
      const user = await getUser(req.auth.sub)
      const knowledge = await answerFromKnowledge(message,{userId:req.auth.sub,universityId:user.default_university_id||null,facultyId:req.body.facultyId||null,courseId:req.body.courseId||null})
      return res.json({ data: { reply: knowledge.answer, action: null, toolsUsed: knowledge.matched ? ['search_tlucs_knowledge'] : [], steps: 1, mode: 'rag', confidence: knowledge.confidence, matched: knowledge.matched, queryId:knowledge.queryId, suggestedActions:knowledge.suggestedActions, retrievalMode: knowledge.retrievalMode, intent } })
    }
    const user = await getUser(req.auth.sub)
    const context = { userId: req.auth.sub, universityId: user.default_university_id, user: { displayName: user.display_name, areaLabel: user.area_label, defaultUniversityId: user.default_university_id, memberships: user.memberships || [] }, now: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh' }
    if (intent?.route === 'confirm' || isNaturalAssistantConfirmation(message)) {
      const token = [...(Array.isArray(req.body.history) ? req.body.history : [])].reverse().find(item => item.role === 'assistant' && item.actionToken)?.actionToken
      const completed = await executeSignedAssistantAction(token, req.auth.sub, context)
      if (completed) return res.json({ data: { reply: `Đã thực hiện thành công: ${completed.summary}.`, action: null, toolsUsed: [completed.type], steps: 0, mode: 'confirmed_action', intent } })
    }
    const planned = await planAgent(message, req.body.history, context)
    if (!planned.action) return res.json({ data: { ...planned, intent } })
    const actionToken = signAssistantAction(planned.action, req.auth.sub)
    const { action: _action, ...safePlanned } = planned
    res.json({ data: { ...safePlanned, action: { type: planned.action.type, summary: planned.action.summary, token: actionToken }, intent } })
  } catch (error) { next(error) }
})

router.post('/actions/execute', requireAuth, async (req, res, next) => {
  try {
    const user = await getUser(req.auth.sub)
    const completed = await executeSignedAssistantAction(req.body.token, req.auth.sub, { universityId: user.default_university_id })
    if (!completed) throw Object.assign(new Error('Thao tác xác nhận không hợp lệ, đã dùng hoặc đã hết hạn.'), { status: 422 })
    res.json({ data: { type: completed.type, result: completed.result } })
  } catch (error) { next(error) }
})

export default router
