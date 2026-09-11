import { env } from '../config/env.js'
import { ASSISTANT_TOOL_SCHEMAS, MUTATING_ASSISTANT_TOOLS, READ_ASSISTANT_TOOLS, executeAssistantTool } from './assistantTools.js'

const systemInstruction = `Bạn là Agent TLUCS — trợ lý AI của Trusted Local University Community Space (TLUCS), nền tảng cộng đồng sinh viên khởi đầu tại HCMUS. Nhiệm vụ của bạn là trò chuyện tự nhiên bằng tiếng Việt, giúp người dùng tra cứu thông tin đáng tin cậy và thực hiện thao tác thật trên nền tảng thay họ khi cần, luôn ưu tiên chính xác, an toàn và đúng phạm vi quyền hạn của người dùng.

Quy định bắt buộc:
- Một tài khoản có thể vừa đăng yêu cầu vừa nhận hỗ trợ. Yêu cầu gồm miễn phí, trả phí và trao đổi.
- Ví, QR, liên kết ngân hàng và thanh toán đều là mô phỏng, không phát sinh tiền thật. Phí nền tảng dự kiến là 1% phần được giải ngân thành công.
- Cấm làm hộ, thi hộ, mua bán đề hoặc đáp án, lừa đảo, đa cấp và chia sẻ dữ liệu trái phép.
- Dùng tool đọc để tra dữ liệu thật; không tự bịa ID, kết quả, trạng thái, số dư, lịch sử hoặc chính sách. Trước khi trả lời, kiểm tra kết quả có thực sự đúng với điều người dùng cần không; nếu chưa đúng, tự suy nghĩ lại đúng ý họ đang cần rồi thử tool hoặc truy vấn khác. Sau tối đa 3 lần thử mà vẫn không ra kết quả đúng yêu cầu hoặc không có dữ liệu, báo thẳng là chưa tìm được, không đoán và không trả lời lạc đề.
- Khi thiếu dữ kiện bắt buộc, hỏi đúng dữ kiện còn thiếu. Hiểu lỗi chính tả, 10k = 10000 VND và thời gian đời thường theo Asia/Ho_Chi_Minh.
- Cụm "trao đổi ngắn" mặc định durationMinutes là 30. "Tầm 8h tối" đã là thời gian đủ rõ và phải hiểu là 20:00, không hỏi lại giờ.
- Khi người dùng muốn thay đổi dữ liệu, hãy gọi đúng tool thay đổi. Máy chủ sẽ yêu cầu họ xác nhận trước khi chạy tool đó.
- Mỗi bước chỉ gọi đúng một tool. Nếu thiếu dữ kiện bắt buộc thì hỏi người dùng, không tạo tool call lỗi hoặc gọi nhiều tool song song.
- Không yêu cầu mật khẩu, OTP, số thẻ đầy đủ hoặc dữ liệu nhạy cảm.
- Trả lời thân thiện, gọn, thường 1 đến 5 câu. Nếu không có dữ liệu đáng tin cậy, nói rõ là chưa biết.`

export function cleanHistory(history) {
  if (!Array.isArray(history)) return []
  return history.slice(-20).map(item => ({
    role: item.role === 'assistant' || item.role === 'bot' ? 'model' : 'user',
    parts: [{ text: String(item.text || '').slice(0, 2000) }],
  })).filter(item => item.parts[0].text)
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function generateGeminiContent(body, timeoutMs = 120000) {
  let lastResult
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.geminiApiKey }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
    })
    const payload = await response.json().catch(() => ({}))
    lastResult = { response, payload }
    if (response.ok || ![429, 500, 503].includes(response.status) || attempt === 2) return lastResult
    await wait(attempt === 0 ? 1000 : 3000)
  }
  return lastResult
}

function lowerCaseSchema(value) {
  if (Array.isArray(value)) return value.map(lowerCaseSchema)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'type' && typeof item === 'string' ? item.toLowerCase() : lowerCaseSchema(item)]))
}

const toGroqTool = tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: lowerCaseSchema(tool.parameters) } })
const toolGroups = [
  { pattern: /yêu cầu|hỗ trợ|ứng viên|gia sư|môn học/i, names: ['search_tlucs','search_requests','list_my_requests','list_my_sessions','create_request','accept_request','select_request_application','pay_request_remaining','release_request_payment','check_in_session','complete_session','review_session','report_no_show','open_request_dispute'] },
  { pattern: /chia sẻ|tài liệu|mở khóa|buổi trao đổi|template|cv|checklist|slide|bộ đề|lộ trình/i, names: ['search_tlucs','search_sharing_posts','list_my_conversations','create_sharing_post','join_sharing_post','confirm_sharing_access','cancel_sharing_participation','cancel_sharing_post','open_sharing_dispute','review_sharing'] },
  { pattern: /ví|tiền|số dư|nạp|rút|thanh toán|giải ngân|tặng/i, names: ['get_my_wallet','wallet_topup','wallet_withdraw','pay_request_remaining','release_request_payment','gift_forum_post','gift_forum_comment'] },
  { pattern: /diễn đàn|bài viết|bình luận|cảm xúc|theo dõi|lưu bài/i, names: ['list_forum_posts','list_forum_comments','create_forum_post','add_forum_comment','react_forum_post','react_forum_comment','save_forum_post','follow_forum_post','gift_forum_post','gift_forum_comment'] },
  { pattern: /tin nhắn|trò chuyện|chat|kênh|server|cộng đồng|thành viên|người dùng/i, names: ['search_people','list_my_conversations','list_my_chat_requests','list_community_servers','list_conversation_messages','list_channel_messages','send_conversation_message','send_channel_message','request_direct_chat','respond_chat_request','block_user','propose_community_channel'] },
  { pattern: /hồ sơ|tài khoản|xác minh|thông báo|tên hiển thị|khu vực/i, names: ['get_my_profile','list_my_notifications','update_profile','mark_notification_read','submit_verification'] },
  { pattern: /báo cáo|khiếu nại|vi phạm|lừa đảo|an toàn/i, names: ['search_tlucs_knowledge','create_report','open_request_dispute','open_sharing_dispute','block_user'] },
]

function groqToolsFor(text) {
  const marketplaceLookup=/(template|cv|checklist|slide|tài liệu|bài chia sẻ|bộ đề|lộ trình)/i.test(text)&&/(cần|tìm|kiếm|có|muốn|mở khóa|xem|gợi ý)/i.test(text)
  const names = new Set(['search_tlucs', ...(marketplaceLookup?[]:['search_tlucs_knowledge']), 'get_my_profile'])
  for (const group of toolGroups) if (group.pattern.test(text)) group.names.forEach(name => names.add(name))
  if (names.size === 3) ['search_requests','search_sharing_posts','search_people','get_my_wallet','list_my_notifications','list_my_conversations','create_report'].forEach(name => names.add(name))
  return ASSISTANT_TOOL_SCHEMAS.filter(tool => names.has(tool.name)).map(toGroqTool)
}

async function generateGroqChat(messages, { tools, timeoutMs = 120000, responseFormat, temperature, modelOverride } = {}) {
  const models = modelOverride ? [modelOverride] : [...new Set([env.groqModel, env.groqFallbackModel].filter(Boolean))]
  let lastResult
  for (const model of models) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.groqApiKey}` },
      body: JSON.stringify({ model, messages, ...(tools?.length ? { tools, tool_choice: 'auto', parallel_tool_calls: false } : {}), ...(responseFormat ? { response_format: responseFormat } : {}), temperature: temperature ?? (tools?.length ? .1 : .5), max_completion_tokens: responseFormat ? 300 : 3000 }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const payload = await response.json().catch(() => ({}))
    lastResult = { response, payload, model }
    if (response.ok) return lastResult
    if (payload?.error?.code !== 'tool_use_failed' && response.status !== 429 && response.status < 500) return lastResult
  }
  return lastResult
}

export const ASSISTANT_INTENT_ROUTES = ['static', 'rag', 'agent_read', 'agent_write', 'confirm', 'clarify']
const intentRouterInstruction = `Bạn là bộ định tuyến ý định cho TLUCS. Chỉ phân loại, không trả lời và không quyết định thực thi.
Chọn đúng một route:
- static: chào hỏi, cảm ơn, giới thiệu TLUCS.
- rag: hỏi kiến thức hoặc chính sách chung; không yêu cầu dữ liệu tài khoản hay thao tác thật.
- agent_read: muốn xem, tìm hoặc mở dữ liệu thật như ví, hồ sơ, yêu cầu, phiên, bài chia sẻ, người dùng, tin nhắn, thông báo.
- agent_write: muốn tạo, sửa, xóa, đăng, nhận, chọn, gửi, nạp, rút, thanh toán hoặc thực hiện thao tác thật.
- confirm: tin mới nhất xác nhận, đồng ý, chốt hoặc sửa lựa chọn của thao tác đang bàn ở các tin trước.
- clarify: ý định chưa rõ hoặc ngoài phạm vi.
Dùng ngữ cảnh tối đa 10 tin gần nhất. Trả JSON duy nhất: {"route":"...","confidence":0.0,"reason":"..."}. Phân loại confirm không phải quyền thực thi; server kiểm tra action và quyền riêng.`

export function normalizeIntentResult(value, provider = 'fallback') {
  const route = String(value?.route || '').toLowerCase()
  if (!ASSISTANT_INTENT_ROUTES.includes(route)) throw new Error('Intent route không hợp lệ.')
  return { route, confidence: Math.min(Math.max(Number(value?.confidence) || 0, 0), 1), reason: String(value?.reason || '').slice(0, 160), provider }
}

function intentConversation(message, history) {
  return [...cleanHistory(history).slice(-9).map(item => ({ role: item.role === 'model' ? 'assistant' : 'user', content: item.parts[0].text.slice(0, 700) })), { role: 'user', content: String(message).slice(0, 700) }]
}

export async function classifyAssistantIntent(message, history = []) {
  const messages = intentConversation(message, history)
  if (env.aiProvider === 'groq' && env.groqApiKey) {
    for (const model of [...new Set([env.groqModel, env.groqFallbackModel].filter(Boolean))]) {
      try {
        const { response, payload } = await generateGroqChat([{ role: 'system', content: intentRouterInstruction }, ...messages], { timeoutMs: 15000, responseFormat: { type: 'json_object' }, temperature: 0, modelOverride: model })
        if (response.ok) return normalizeIntentResult(JSON.parse(payload.choices?.[0]?.message?.content || '{}'), `groq:${model}`)
      } catch (error) { console.warn(`[intent-router] Groq ${model} fallback:`, error.message) }
    }
  }
  if (env.geminiApiKey) {
    try {
      const transcript = messages.map(item => `${item.role}: ${item.content}`).join('\n')
      const { response, payload } = await generateGeminiContent({
        contents: [{ role: 'user', parts: [{ text: `${intentRouterInstruction}\n\nHội thoại:\n${transcript}` }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { route: { type: 'STRING', enum: ASSISTANT_INTENT_ROUTES.map(item => item.toUpperCase()) }, confidence: { type: 'NUMBER' }, reason: { type: 'STRING' } }, required: ['route', 'confidence', 'reason'] },
        },
      }, 15000)
      if (response.ok) return normalizeIntentResult(JSON.parse(textFromParts(responseParts(payload))), `gemini:${env.geminiModel}`)
    } catch (error) { console.warn('[intent-router] Gemini fallback:', error.message) }
  }
  return null
}

function providerError(response, payload) {
  const providerMessage = payload?.error?.message || ''
  const quota = response.status === 429 || /quota|rate limit|resource exhausted/i.test(providerMessage)
  return Object.assign(new Error(quota ? 'Gemini đã hết hạn mức API hiện tại. Bạn vẫn có thể dùng tra cứu RAG nội bộ.' : 'AI Agent đang bận hoặc chưa phản hồi. Bạn có thể thử lại sau.'), { status: response.status === 429 ? 429 : 502, code: quota ? 'AI_QUOTA_EXCEEDED' : 'AI_PROVIDER_ERROR', cause: payload?.error })
}

function groqError(response, payload) {
  const message = payload?.error?.message || ''
  const quota = response.status === 429 || /quota|rate limit|tokens per/i.test(message)
  return Object.assign(new Error(quota ? 'Groq đã chạm giới hạn hiện tại; Agent sẽ thử Gemini dự phòng.' : 'Groq đang bận hoặc từ chối yêu cầu.'), { status: response.status === 429 ? 429 : 502, code: quota ? 'AI_QUOTA_EXCEEDED' : 'AI_PROVIDER_ERROR', cause: payload?.error })
}

const responseParts = payload => payload?.candidates?.[0]?.content?.parts || []
const textFromParts = parts => parts.map(part => part.text).filter(Boolean).join('\n').trim()
function trimToolResult(value) { const json = JSON.stringify(value ?? null); return json.length <= 12000 ? value ?? null : { truncated: true, preview: json.slice(0, 12000) } }

function pendingSummary(name, args) {
  const labels = {
    create_request: 'Đăng yêu cầu hỗ trợ', accept_request: 'Nhận yêu cầu', select_request_application: 'Chọn ứng viên', create_sharing_post: 'Đăng bài chia sẻ', join_sharing_post: 'Tham gia bài chia sẻ', confirm_sharing_access: 'Xác nhận đã nhận nội dung', cancel_sharing_participation: 'Hủy tham gia', cancel_sharing_post: 'Hủy bài chia sẻ', update_profile: 'Cập nhật hồ sơ', wallet_topup: 'Nạp ví mô phỏng', wallet_withdraw: 'Rút ví mô phỏng', pay_request_remaining: 'Thanh toán phần còn lại', release_request_payment: 'Giải ngân giao dịch', check_in_session: 'Check-in phiên', complete_session: 'Hoàn tất phiên', review_session: 'Đánh giá phiên', report_no_show: 'Báo vắng mặt', open_request_dispute: 'Mở tranh chấp yêu cầu', open_sharing_dispute: 'Mở tranh chấp chia sẻ', create_forum_post: 'Đăng bài diễn đàn', add_forum_comment: 'Gửi bình luận', react_forum_post: 'Thả cảm xúc bài viết', react_forum_comment: 'Thả cảm xúc bình luận', save_forum_post: 'Lưu hoặc bỏ lưu bài', follow_forum_post: 'Theo dõi hoặc bỏ theo dõi bài', gift_forum_post: 'Tặng quà bài viết', gift_forum_comment: 'Tặng quà bình luận', send_conversation_message: 'Gửi tin nhắn riêng', send_channel_message: 'Gửi tin nhắn kênh', request_direct_chat: 'Gửi lời mời trò chuyện', respond_chat_request: 'Phản hồi lời mời chat', mark_notification_read: 'Đánh dấu thông báo đã đọc', propose_community_channel: 'Đề xuất kênh cộng đồng', submit_verification: 'Gửi yêu cầu xác minh', create_report: 'Gửi báo cáo hỗ trợ',
  }
  const details = Object.entries(args || {}).filter(([, value]) => value !== undefined && value !== '').slice(0, 5).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · ')
  return `${labels[name] || name}${details ? ` — ${details}` : ''}`
}

function normalizeVietnamese(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd')
}

export function normalizeAgentAction(name, args = {}, message = '', context = {}) {
  const result = { ...args }
  if (!['create_request', 'create_sharing_post'].includes(name)) return result
  const text = normalizeVietnamese(message)
  if (name === 'create_request' && /trao doi ngan/.test(text) && !Number(result.durationMinutes)) result.durationMinutes = 30
  if (!/(^|\s)(ngay mai|mai)(\s|$|[?.!,])/.test(text)) return result
  const time = text.match(/(\d{1,2})(?:h|\s*gio)(\d{1,2})?/) || text.match(/(\d{1,2}):(\d{2})/)
  if (!time) return result
  let hour = Number(time[1]), minute = Number(time[2] || 0)
  if (/(buoi toi|toi mai|chieu toi|chieu mai)/.test(text) && hour < 12) hour += 12
  if (hour > 23 || minute > 59) return result
  const now = new Date(context.now || Date.now())
  const vietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  vietnam.setUTCDate(vietnam.getUTCDate() + 1)
  const date = `${vietnam.getUTCFullYear()}-${String(vietnam.getUTCMonth() + 1).padStart(2, '0')}-${String(vietnam.getUTCDate()).padStart(2, '0')}`
  result.startsAt = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`
  return result
}

export async function askAssistant(message, history = []) {
  const text = String(message || '').trim()
  if (!text || text.length > 2000) throw Object.assign(new Error('Câu hỏi cần từ 1 đến 2.000 ký tự.'), { status: 422 })
  if (env.groqApiKey) {
    const messages = [{ role: 'system', content: systemInstruction }, ...cleanHistory(history).map(item => ({ role: item.role === 'model' ? 'assistant' : 'user', content: item.parts[0].text })), { role: 'user', content: text }]
    const { response, payload } = await generateGroqChat(messages)
    if (response.ok && payload.choices?.[0]?.message?.content) return payload.choices[0].message.content.trim()
    if (!env.geminiApiKey) throw groqError(response, payload)
  }
  if (!env.geminiApiKey) throw Object.assign(new Error('Trợ lý AI chưa được cấu hình.'), { status: 503, code: 'AI_NOT_CONFIGURED' })
  const { response, payload } = await generateGeminiContent({ system_instruction: { parts: [{ text: systemInstruction }] }, contents: [...cleanHistory(history), { role: 'user', parts: [{ text }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1024 } })
  if (!response.ok) throw providerError(response, payload)
  const answer = textFromParts(responseParts(payload))
  if (!answer) throw Object.assign(new Error('Trợ lý AI chưa tạo được câu trả lời.'), { status: 502, code: 'AI_EMPTY_RESPONSE' })
  return answer
}

async function planWithGemini(text, history, context) {
  const contents = [...cleanHistory(history), { role: 'user', parts: [{ text }] }], toolsUsed = []
  const instruction = `${systemInstruction}\nBối cảnh người dùng và thời gian hiện tại (JSON): ${JSON.stringify(context)}`
  for (let step = 1; step <= 12; step += 1) {
    const { response, payload } = await generateGeminiContent({ system_instruction: { parts: [{ text: instruction }] }, contents, tools: [{ functionDeclarations: ASSISTANT_TOOL_SCHEMAS }], toolConfig: { functionCallingConfig: { mode: 'AUTO' } }, generationConfig: { temperature: 0.2, maxOutputTokens: 3000 } })
    if (!response.ok) throw providerError(response, payload)
    const parts = responseParts(payload), calls = parts.filter(part => part.functionCall).map(part => part.functionCall)
    if (!calls.length) return { reply: textFromParts(parts) || 'Mình chưa biết câu trả lời đáng tin cậy cho yêu cầu này.', action: null, toolsUsed, steps: step }
    contents.push({ role: 'model', parts })
    const responses = []
    for (const call of calls) {
      const name = call.name, args = normalizeAgentAction(call.name, call.args || {}, text, context)
      if (MUTATING_ASSISTANT_TOOLS.has(name)) return { reply: 'Mình đã chuẩn bị thao tác dưới đây. Bạn kiểm tra rồi xác nhận để mình thực hiện.', action: { type: name, summary: pendingSummary(name, args), payload: args }, toolsUsed, steps: step }
      if (!READ_ASSISTANT_TOOLS.has(name)) { responses.push({ functionResponse: { name, response: { error: 'Tool không được hỗ trợ.' } } }); continue }
      try { const result = await executeAssistantTool(name, args, context); toolsUsed.push(name); responses.push({ functionResponse: { name, response: { result: trimToolResult(result) } } }) }
      catch (error) { responses.push({ functionResponse: { name, response: { error: error.message } } }) }
    }
    contents.push({ role: 'user', parts: responses })
  }
  return { reply: 'Mình đã dùng tối đa 12 bước nhưng chưa đủ dữ liệu để hoàn tất. Bạn hãy nói cụ thể hơn một chút.', action: null, toolsUsed, steps: 12 }
}

async function planWithGroq(text, history, context) {
  const messages = [{ role: 'system', content: `${systemInstruction}\nBối cảnh người dùng và thời gian hiện tại (JSON): ${JSON.stringify(context)}` }, ...cleanHistory(history).map(item => ({ role: item.role === 'model' ? 'assistant' : 'user', content: item.parts[0].text })), { role: 'user', content: text }]
  const toolsUsed = []
  for (let step = 1; step <= 12; step += 1) {
    const { response, payload, model } = await generateGroqChat(messages, { tools: groqToolsFor(text) })
    if (!response.ok) throw groqError(response, payload)
    const message = payload.choices?.[0]?.message
    if (!message) throw Object.assign(new Error('Groq không trả về nội dung.'), { status: 502, code: 'AI_EMPTY_RESPONSE' })
    const calls = message.tool_calls || []
    if (!calls.length) return { reply: String(message.content || '').trim() || 'Mình chưa biết câu trả lời đáng tin cậy cho yêu cầu này.', action: null, toolsUsed, steps: step, provider: 'groq', providerModel: model }
    messages.push(message)
    for (const call of calls) {
      const name = call.function?.name
      let args = {}
      try { args = JSON.parse(call.function?.arguments || '{}') } catch { args = {} }
      args = normalizeAgentAction(name, args, text, context)
      if (MUTATING_ASSISTANT_TOOLS.has(name)) return { reply: 'Mình đã chuẩn bị thao tác dưới đây. Bạn kiểm tra rồi xác nhận để mình thực hiện.', action: { type: name, summary: pendingSummary(name, args), payload: args }, toolsUsed, steps: step, provider: 'groq', providerModel: model }
      if (!READ_ASSISTANT_TOOLS.has(name)) { messages.push({ role: 'tool', tool_call_id: call.id, name, content: JSON.stringify({ error: 'Tool không được hỗ trợ.' }) }); continue }
      try { const result = await executeAssistantTool(name, args, context); toolsUsed.push(name); messages.push({ role: 'tool', tool_call_id: call.id, name, content: JSON.stringify({ result: trimToolResult(result) }) }) }
      catch (error) { messages.push({ role: 'tool', tool_call_id: call.id, name, content: JSON.stringify({ error: error.message }) }) }
    }
  }
  return { reply: 'Mình đã dùng tối đa 12 bước nhưng chưa đủ dữ liệu để hoàn tất. Bạn hãy nói cụ thể hơn một chút.', action: null, toolsUsed, steps: 12, provider: 'groq' }
}

export async function planAgent(message, history = [], context = {}) {
  const text = String(message || '').trim()
  if (!text || text.length > 2000) throw Object.assign(new Error('Yêu cầu cần từ 1 đến 2.000 ký tự.'), { status: 422 })
  if (!env.groqApiKey && !env.geminiApiKey) throw Object.assign(new Error('AI Agent chưa được cấu hình. Tra cứu RAG nội bộ vẫn hoạt động.'), { status: 503, code: 'AI_NOT_CONFIGURED' })
  let groqFailure
  if (env.aiProvider === 'groq' && env.groqApiKey) {
    try { return await planWithGroq(text, history, context) }
    catch (error) { groqFailure = error; if (!env.geminiApiKey) throw error }
  }
  try {
    const result = await planWithGemini(text, history, context)
    return { ...result, provider: 'gemini' }
  } catch (error) {
    if (!groqFailure) throw error
    throw Object.assign(new Error(`Groq chưa tạo được tool call hợp lệ và Gemini dự phòng cũng không khả dụng: ${error.message}`), { status: error.status || 502, code: 'AI_ALL_PROVIDERS_FAILED', providers: { groq: groqFailure.code, gemini: error.code } })
  }
}
