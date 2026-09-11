import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useUniversity } from '../context/UniversityContext'

const routes = { requests: '/yeu-cau', sharing: '/chia-se', posts: '/dien-dan', servers: '/server', users: '/peers', courses: '/yeu-cau' }
const labels = { requests: 'Yêu cầu', sharing: 'Bảng chia sẻ', posts: 'Diễn đàn', servers: 'Server trường', users: 'Thành viên', courses: 'Môn học' }

export default function SearchPage() {
  const { session } = useAuth()
  const { activeUniversityId } = useUniversity()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (q.trim().length < 2) { setData(null); return }
    const query = new URLSearchParams({ q })
    if (activeUniversityId) query.set('universityId', activeUniversityId)
    const timer = setTimeout(() => api(`/search?${query}`, { token: session?.accessToken }).then(x => { setData(x.data); setError('') }).catch(e => setError(e.message)), 250)
    return () => clearTimeout(timer)
  }, [q, session, activeUniversityId])
  return <div className="page py-12"><h1 className="text-4xl font-black">Tìm trên toàn TLUCS</h1><div className="mt-6 flex items-center gap-3 rounded-2xl border bg-white px-5"><Search/><input autoFocus value={q} onChange={e => { setQ(e.target.value); setParams(e.target.value ? { q: e.target.value } : {}) }} className="w-full py-4 outline-none" placeholder="Yêu cầu, bài chia sẻ, môn học, người dùng..."/></div>{error && <p className="mt-4 text-red-600">{error}</p>}<div className="mt-8 grid gap-6 md:grid-cols-2">{data && Object.entries(data).map(([group, items]) => <section className="card p-5" key={group}><h2 className="font-black">{labels[group]} · {items.length}</h2><div className="mt-4 space-y-3">{items.map(x => <Link to={routes[group]} className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50" key={x.id}><b>{x.title || x.display_name || x.name}</b><p className="line-clamp-1 text-sm text-slate-500">{x.description || x.body || x.university_code || x.account_kind}</p></Link>)}{!items.length && <p className="text-sm text-slate-400">Không có kết quả.</p>}</div></section>)}</div></div>
}
