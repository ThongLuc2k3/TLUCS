import { useEffect, useState } from 'react'
/* oxlint-disable react-hooks/exhaustive-deps */
import { CheckCircle2, Clock3, MessageSquare, Star, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function SessionsPage() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [notice, setNotice] = useState('')
  const load = () => session && api('/sessions', { token: session.accessToken }).then(x => setItems(x.data)).catch(e => setNotice(e.message))
  useEffect(() => { load() }, [session])

  async function action(id, path, body = {}, method = 'POST') {
    try { await api(`/sessions/${id}/${path}`, { method, token: session.accessToken, body }); setNotice(path === 'complete' ? 'Đã hoàn tất và xử lý giải ngân.' : 'Đã ghi nhận.'); load() }
    catch (error) { setNotice(error.message) }
  }
  async function pay(id) { try { await api(`/wallet/requests/${id}/pay`, { method: 'POST', token: session.accessToken, body: {} }); setNotice('Đã giữ phần tiền còn lại cho phiên.'); load() } catch (error) { setNotice(error.message) } }
  async function dispute(id) { const reason = prompt('Mô tả tranh chấp (ít nhất 10 ký tự)'); if (reason) await action(id, 'disputes', { reason }) }
  if (!session) return <div className="page py-24 text-center"><h1 className="text-3xl font-black">Đăng nhập để quản lý lịch</h1><Link to="/login" className="btn-primary mt-5">Đăng nhập</Link></div>
  return <div className="page py-12"><span className="eyebrow">Lịch và giao dịch</span><h1 className="mt-4 text-4xl font-black">Phiên của tôi</h1><p className="mt-3 text-slate-500">Quản lý phiên trực tuyến, thanh toán, điểm danh và đánh giá.</p>{notice && <p className="mt-5 rounded-xl bg-blue-50 p-3 text-blue-700">{notice}</p>}<div className="mt-8 space-y-5">{items.map(x => <article className="card p-6" key={x.id}><div className="flex flex-wrap justify-between gap-4"><div><span className="tag tag-blue">{x.role === 'author' ? 'Bạn đăng' : 'Bạn nhận'}</span><h2 className="mt-3 text-xl font-black">{x.title}</h2><p className="mt-2 flex gap-2 text-sm text-slate-500"><Clock3 size={17}/>{new Date(x.starts_at).toLocaleString('vi-VN')} · {x.duration_minutes} phút · Trực tuyến</p></div><b className="text-[#2D5BFF]">{x.status}</b></div><div className="mt-5 flex flex-wrap gap-3 border-t pt-5"><button className="btn-secondary" onClick={() => action(x.id, 'attendance', { eventType: 'check_in' })}><UserCheck size={17}/> Check-in</button>{x.conversation_id && <Link className="btn-secondary" to="/tin-nhan"><MessageSquare size={17}/> Mở chat</Link>}{x.role === 'author' && x.kind === 'paid' && x.status !== 'completed' && <button className="btn-secondary" onClick={() => pay(x.id)}>Thanh toán còn lại</button>}{x.role === 'author' && x.status !== 'completed' && <button className="btn-primary" onClick={() => action(x.id, 'complete')}><CheckCircle2 size={17}/> Hoàn tất</button>}{x.status === 'completed' && <button className="btn-secondary" onClick={() => action(x.id, 'reviews', { rating: Number(prompt('Số sao 1–5', '5')), comment: prompt('Nhận xét', 'Hỗ trợ nhiệt tình và đúng giờ.') || '' })}><Star size={17}/> Đánh giá</button>}{!['completed', 'cancelled'].includes(x.status) && <button className="btn-secondary" onClick={() => action(x.id, 'no-show', { absentParty: x.role === 'author' ? 'receiver' : 'author', note: 'Bên còn lại vắng mặt quá 50% thời lượng.' })}>Báo vắng</button>}{x.kind === 'paid' && !['completed', 'cancelled', 'disputed'].includes(x.status) && <button className="btn-secondary" onClick={() => dispute(x.id)}>Tranh chấp</button>}</div></article>)}{!items.length && <div className="card p-12 text-center text-slate-400">Bạn chưa có phiên nào.</div>}</div></div>
}
