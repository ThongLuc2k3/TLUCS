import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, Send, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const welcome = { role: 'bot', text: 'Chào bạn! Mình là Agent TLUCS. Bạn có thể nhờ mình tra cứu, đăng và nhận yêu cầu, quản lý bài chia sẻ, ví, phiên hỗ trợ, diễn đàn, cộng đồng, tin nhắn, xác minh hoặc báo cáo ngay trong chat.' }
const quickQuestions = ['Cách đăng yêu cầu', 'Tìm bài chia sẻ phù hợp', 'Cách nạp tiền', 'Gửi khiếu nại']
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }

export default function AiChatbot() {
  const { session, user } = useAuth()
  const [open, setOpen] = useState(false), [input, setInput] = useState(''), [messages, setMessages] = useState([welcome]), [awaitingComplaint, setAwaitingComplaint] = useState(false), [busy, setBusy] = useState(false)
  const [pendingAction,setPendingAction]=useState(null)
  const listRef = useRef(null)
  const wasOpenRef = useRef(false)
  const skipPersistRef = useRef(false)
  const loadedDayRef = useRef(localDay())
  const storageKey = `tlucs-agent-history:${user?.id || 'guest'}`
  useEffect(() => {
    skipPersistRef.current = true
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || 'null')
      const saved = raw && raw.day === localDay() && Array.isArray(raw.messages) ? raw.messages : []
      setMessages(saved.length ? [welcome, ...saved.slice(-20)] : [welcome])
    } catch { setMessages([welcome]) }
    loadedDayRef.current = localDay()
    setPendingAction(null)
  }, [storageKey])
  useEffect(() => {
    if (skipPersistRef.current) { skipPersistRef.current = false; return }
    const recent = messages.filter((message, index) => index > 0 && ['user', 'bot'].includes(message.role)).slice(-20)
    localStorage.setItem(storageKey, JSON.stringify({ day: localDay(), messages: recent }))
  }, [messages, storageKey])
  useEffect(() => {
    if (open && loadedDayRef.current !== localDay()) {
      skipPersistRef.current = true
      loadedDayRef.current = localDay()
      setPendingAction(null)
      setMessages([welcome])
      return
    }
    const el = listRef.current
    if (open && el) el.scrollTo({ top: el.scrollHeight, behavior: wasOpenRef.current ? 'smooth' : 'auto' })
    wasOpenRef.current = open
  }, [open, messages, busy])

  async function sendText(value) {
    const text = value.trim(); if (!text || busy) return
    setInput(''); setMessages(list => [...list, { role: 'user', text }])
    if (awaitingComplaint) {
      if (text.length < 10) return setMessages(list => [...list, { role: 'bot', text: 'Bạn vui lòng mô tả ít nhất 10 ký tự để bộ phận hỗ trợ có đủ thông tin xử lý.' }])
      if (!session) { setAwaitingComplaint(false); return setMessages(list => [...list, { role: 'bot', text: 'Bạn cần đăng nhập để gửi khiếu nại và theo dõi danh tính người gửi.' }]) }
      setBusy(true)
      try {
        const { data } = await api('/operations/reports', { method: 'POST', token: session.accessToken, body: { targetType: 'support', targetId: user.id, reason: text } })
        setAwaitingComplaint(false); setMessages(list => [...list, { role: 'bot', text: `Đã tiếp nhận khiếu nại. Mã hỗ trợ: ${data.id.slice(0, 8).toUpperCase()}. Quản trị viên sẽ xem nội dung trong hàng đợi xử lý.` }])
      } catch (error) { setMessages(list => [...list, { role: 'bot', text: `Chưa thể gửi khiếu nại: ${error.message}` }]) } finally { setBusy(false) }
      return
    }
    setBusy(true)
    try {
      const history = messages.slice(-20).map(message => ({ role: message.role === 'bot' ? 'assistant' : 'user', text: message.text, ...(message.actionToken ? { actionToken: message.actionToken } : {}) }))
      if(session){const {data}=await api('/assistant/agent',{method:'POST',token:session.accessToken,body:{message:text,history}});setMessages(list=>[...list,{role:'bot',text:data.reply,toolsUsed:data.toolsUsed||[],steps:data.steps,mode:data.mode,provider:data.provider,matched:data.matched,retrievalMode:data.retrievalMode,queryId:data.queryId,actionToken:data.action?.token}]);setPendingAction(data.action||null)}
      else {const { data } = await api('/assistant/chat', { method: 'POST', body: { message: text, history } });setMessages(list => [...list, { role: 'bot', text: data.answer,mode:data.mode,matched:data.matched,retrievalMode:data.retrievalMode,queryId:data.queryId }])}
    } catch (error) {
      setMessages(list => [...list, { role: 'bot', text: error.message || 'Agent chưa thể phản hồi lúc này. Bạn có thể thử lại sau.' }])
    } finally { setBusy(false) }
  }
  const actionDoneText={create_request:'Mình đã đăng yêu cầu thành công.',update_profile:'Mình đã cập nhật hồ sơ thành công.',create_sharing_post:'Mình đã đăng bài chia sẻ thành công.',wallet_topup:'Mình đã nạp tiền vào ví mô phỏng thành công.',wallet_withdraw:'Mình đã rút tiền khỏi ví mô phỏng thành công.',create_report:'Mình đã gửi báo cáo tới quản trị viên.',send_conversation_message:'Mình đã gửi tin nhắn.',send_channel_message:'Mình đã gửi tin nhắn vào kênh.',submit_verification:'Mình đã gửi yêu cầu xác minh.'}
  async function executeAction(){if(!pendingAction?.token||busy)return;setBusy(true);try{const {data}=await api('/assistant/actions/execute',{method:'POST',token:session.accessToken,body:{token:pendingAction.token}});setMessages(list=>[...list,{role:'bot',text:actionDoneText[data.type]||'Mình đã thực hiện thành công.'}]);setPendingAction(null)}catch(error){setMessages(list=>[...list,{role:'bot',text:`Chưa thể thực hiện: ${error.message}`}])}finally{setBusy(false)}}
  function startComplaint() { setOpen(true); setAwaitingComplaint(true); setMessages(list => [...list, { role: 'bot', text: 'Bạn hãy mô tả vấn đề, thời điểm xảy ra và điều bạn mong muốn được hỗ trợ. Nội dung sẽ được chuyển đến quản trị viên.' }]) }
  async function rateKnowledge(queryId,useful,index){if(!session||!queryId)return;try{await api('/knowledge/feedback',{method:'POST',token:session.accessToken,body:{queryId,useful}});setMessages(list=>list.map((m,i)=>i===index?{...m,feedback:true}:m))}catch(error){setMessages(list=>[...list,{role:'bot',text:`Chưa ghi nhận được đánh giá: ${error.message}`}])}}

  return <div className="fixed bottom-5 right-4 z-[75] sm:bottom-7 sm:right-7">
    {open && <section className="mb-3 flex h-[min(620px,calc(100vh-110px))] w-[min(390px,calc(100vw-28px))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center gap-3 bg-[#183153] px-5 py-4 text-white"><span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2D5BFF]"><Bot size={25}/><Sparkles className="absolute -right-1 -top-1 text-[#B7F34A]" size={14}/><i className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#183153] bg-[#B7F34A]"/></span><div className="flex-1"><h2 className="font-black">Trợ lý AI TLUCS</h2><p className="text-xs text-blue-200">Hỗ trợ và tiếp nhận khiếu nại</p></div><button onClick={() => setOpen(false)} aria-label="Thu nhỏ chatbot"><ChevronDown/></button></header>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">{messages.map((message, index) =><div key={index} className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto rounded-br-md bg-[#2D5BFF] text-white' : 'rounded-bl-md border bg-white text-slate-600 shadow-sm'}`}>{message.text}{message.role==='bot'&&(message.toolsUsed?.length>0||message.mode==='rag'||message.provider)&&<p className="mt-2 border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-400">{message.mode==='rag'?(message.matched?'RAG ngữ nghĩa · Đã đối chiếu nguồn':'Không tìm thấy tài liệu đủ tin cậy · Có thể đăng diễn đàn hoặc tạo yêu cầu'):`Agent ${message.provider==='groq'?'Groq':message.provider==='gemini'?'Gemini dự phòng':'nội bộ'} · ${message.steps||1} bước${message.toolsUsed?.length?` · ${message.toolsUsed.join(', ')}`:''}`}</p>}{session&&message.queryId&&message.matched&&!message.feedback&&<div className="mt-2 flex gap-2 text-xs"><button type="button" onClick={()=>rateKnowledge(message.queryId,true,index)} className="rounded-lg border px-2 py-1">Hữu ích</button><button type="button" onClick={()=>rateKnowledge(message.queryId,false,index)} className="rounded-lg border px-2 py-1">Chưa đúng</button></div>}{message.feedback&&<p className="mt-1 text-[10px] text-slate-400">Đã ghi nhận đánh giá.</p>}</div>)}{busy && <div className="w-fit rounded-2xl bg-white px-4 py-3 text-sm text-slate-400 shadow-sm">{awaitingComplaint ? 'Đang gửi đến bộ phận hỗ trợ...' : 'Agent đang suy luận và gọi tool...'}</div>}</div>
      <div className="border-t bg-white p-3">{pendingAction&&<div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-black uppercase text-[#2D5BFF]">Agent đề xuất hành động</p><p className="mt-1 text-sm text-slate-700">{pendingAction.summary}</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={executeAction} className="btn-primary !px-3 !py-2">Xác nhận</button><button onClick={()=>setPendingAction(null)} className="btn-secondary !px-3 !py-2">Hủy</button></div></div>}<div className="mb-3 flex gap-2 overflow-x-auto pb-1">{quickQuestions.map(question => <button key={question} onClick={() => question === 'Gửi khiếu nại' ? startComplaint() : sendText(question)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#2D5BFF] hover:text-[#2D5BFF]">{question}</button>)}</div><form onSubmit={event => { event.preventDefault(); sendText(input) }} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3"><input aria-label="Nhập câu hỏi" value={input} onChange={event => setInput(event.target.value)} className="!border-0 !bg-transparent !px-1 !shadow-none" placeholder={awaitingComplaint ? 'Mô tả khiếu nại...' : 'Hỏi hoặc nhờ Agent thực hiện...'}/><button disabled={!input.trim() || busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2D5BFF] text-white disabled:opacity-40"><Send size={17}/></button></form><p className="mt-2 text-center text-[10px] text-slate-400">Agent luôn yêu cầu xác nhận trước khi thay đổi dữ liệu.<br/>Không chia sẻ mật khẩu hoặc OTP.</p></div>
    </section>}
    <button onClick={() => setOpen(value => !value)} aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'} className="group ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2D5BFF] text-white shadow-[0_12px_35px_rgba(45,91,255,.4)] transition hover:scale-105 hover:bg-[#2149db]">
      {open ? <ChevronDown size={28}/> : <span className="relative"><Bot size={30}/><Sparkles className="absolute -right-2 -top-2 text-[#B7F34A]" size={15}/></span>}
    </button>
  </div>
}
