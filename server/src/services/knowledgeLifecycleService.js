import { createHash } from 'node:crypto'
import { database } from '../db/connection.js'
import { env } from '../config/env.js'
import { embedText, embeddingEnabled, vectorLiteral } from './embeddingService.js'

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const sourceKey = (type, id) => `${type}:${id}`

export function chunkCommunityText(text, { targetWords = 450, overlapWords = 70 } = {}) {
  const words = clean(text).split(' ').filter(Boolean), chunks = []
  if (!words.length) return chunks
  for (let start = 0; start < words.length; start += targetWords - overlapWords) {
    chunks.push(words.slice(start, start + targetWords).join(' '))
    if (start + targetWords >= words.length) break
  }
  return chunks
}

async function snapshotVersion(client, document) {
  await client.query(`insert into knowledge_document_versions(document_id,version,title,content,metadata) values($1,$2,$3,$4,$5) on conflict do nothing`, [document.id, document.version, document.title, document.content, { visibility: document.visibility, authority: document.authority, provenance: document.provenance }])
}

export async function upsertKnowledgeDocument(input, { autoApprove = false } = {}) {
  const db = database(); if (!db) return null
  const title = clean(input.title), content = clean(input.content)
  if (title.length < 5 || content.length < 20) return null
  const visibility = ['public','paid_preview','private'].includes(input.visibility) ? input.visibility : 'public'
  if (visibility === 'private' && !input.optIn) throw Object.assign(new Error('Nội dung riêng tư chỉ được đưa vào kho khi người đóng góp đồng ý.'), { status: 422 })
  const safeContent = visibility === 'paid_preview' ? clean(input.preview || content.slice(0, 500)) : content
  const client = await db.connect()
  try {
    await client.query('begin')
    const previous = input.sourceId ? (await client.query('select * from knowledge_documents where source_type=$1 and source_id=$2 for update', [input.sourceType, String(input.sourceId)])).rows[0] : null
    if(previous&&previous.title===title&&previous.content===safeContent&&previous.visibility===visibility&&previous.status===(autoApprove?'approved':(input.status||'pending'))){await client.query('commit');return previous}
    if (previous) await snapshotVersion(client, previous)
    const values = [input.sourceType, input.sourceId ? String(input.sourceId) : null, title, safeContent, clean(input.preview), visibility, input.contributorId || null, input.universityId || null, input.facultyId || null, input.courseId || null, input.term || null, clean(input.provenance || sourceKey(input.sourceType,input.sourceId)), input.evidenceType || 'community', input.authority || 'community_contribution', Number(input.confidence || .85), input.expiresAt || null, autoApprove ? 'approved' : (input.status || 'pending'), Boolean(input.optIn), Boolean(input.anonymized)]
    const result = (await client.query(`insert into knowledge_documents(source_type,source_id,title,content,preview,visibility,contributor_id,university_id,faculty_id,course_id,term,provenance,evidence_type,authority,confidence,expires_at,status,opt_in,anonymized)
      values(${values.map((_,i)=>`$${i+1}`).join(',')}) on conflict(source_type,source_id) do update set title=excluded.title,content=excluded.content,preview=excluded.preview,visibility=excluded.visibility,university_id=excluded.university_id,faculty_id=excluded.faculty_id,course_id=excluded.course_id,term=excluded.term,provenance=excluded.provenance,evidence_type=excluded.evidence_type,authority=excluded.authority,confidence=excluded.confidence,expires_at=excluded.expires_at,status=excluded.status,opt_in=excluded.opt_in,anonymized=excluded.anonymized,version=knowledge_documents.version+1,updated_at=now() returning *`, values)).rows[0]
    await client.query('commit')
    if (result.status === 'approved') await indexKnowledgeDocument(result.id)
    return result
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
}

export async function indexKnowledgeDocument(documentId) {
  const db = database(); if (!db || !embeddingEnabled()) return { indexed: 0 }
  const document = (await db.query(`select * from knowledge_documents where id=$1 and status='approved' and (expires_at is null or expires_at>now())`, [documentId])).rows[0]
  if (!document) return { indexed: 0 }
  const parts = chunkCommunityText(`${document.title}. ${document.content}`), ids = []
  for (let i=0;i<parts.length;i++) {
    const id = `db:${document.id}#${i+1}`, content = parts[i], hash = createHash('sha256').update(`${env.embeddingModel}\n${content}`).digest('hex')
    ids.push(id)
    const existing = await db.query('select 1 from knowledge_chunks where id=$1 and content_hash=$2 and embedding_model=$3', [id,hash,env.embeddingModel])
    if (existing.rowCount) continue
    const vector = await embedText(content, 'RETRIEVAL_DOCUMENT')
    const metadata = { domain:'community', university_id:document.university_id, faculty_id:document.faculty_id, course_id:document.course_id, term:document.term, authority:document.authority, evidence_type:document.evidence_type, provenance:document.provenance, confidence:Number(document.confidence), version:document.version }
    await db.query(`insert into knowledge_chunks(id,source,title,content,metadata,content_hash,embedding,embedding_model,document_id,visibility,expires_at,contributor_id,embedded_at) values($1,$2,$3,$4,$5,$6,$7::vector,$8,$9,$10,$11,$12,now()) on conflict(id) do update set title=excluded.title,content=excluded.content,metadata=excluded.metadata,content_hash=excluded.content_hash,embedding=excluded.embedding,embedding_model=excluded.embedding_model,visibility=excluded.visibility,expires_at=excluded.expires_at,contributor_id=excluded.contributor_id,embedded_at=now()`, [id,sourceKey(document.source_type,document.source_id),document.title,content,metadata,hash,vectorLiteral(vector),env.embeddingModel,document.id,document.visibility,document.expires_at,document.contributor_id])
  }
  if (ids.length) await db.query('delete from knowledge_chunks where document_id=$1 and not(id=any($2::text[]))',[document.id,ids])
  return { indexed: ids.length }
}

export async function syncCommunityKnowledge() {
  const db=database(); if(!db)return {synced:0}; let synced=0
  const posts=(await db.query(`select p.id,p.author_id,p.title,p.body,s.university_id,pm.reaction_count from posts p left join community_servers s on s.id=p.server_id join post_metrics pm on pm.post_id=p.id where p.moderation_status='published' and p.deleted_at is null and p.knowledge_opt_in=true and p.ai_processing_consent=true and pm.reaction_count>=3`)).rows
  for(const p of posts){await upsertKnowledgeDocument({sourceType:'forum_post',sourceId:p.id,title:p.title||'Bài viết cộng đồng',content:p.body,contributorId:p.author_id,universityId:p.university_id,provenance:`forum/posts/${p.id}`,evidenceType:'community_consensus',authority:'student_experience',confidence:Math.min(.95,.82+Number(p.reaction_count)*.02),optIn:true},{autoApprove:true});synced++}
  const comments=(await db.query(`select c.id,c.author_id,c.body,c.reaction_count,s.university_id from comments c join posts p on p.id=c.post_id left join community_servers s on s.id=p.server_id where c.moderation_status='published' and c.deleted_at is null and c.knowledge_opt_in=true and c.ai_processing_consent=true and c.reaction_count>=3`)).rows
  for(const c of comments){await upsertKnowledgeDocument({sourceType:'forum_comment',sourceId:c.id,title:'Câu trả lời hữu ích từ cộng đồng',content:c.body,contributorId:c.author_id,universityId:c.university_id,provenance:`forum/comments/${c.id}`,evidenceType:'community_consensus',authority:'student_experience',confidence:Math.min(.94,.82+Number(c.reaction_count)*.02),optIn:true},{autoApprove:true});synced++}
  const shares=(await db.query(`select * from sharing_posts where status='published' and deleted_at is null and knowledge_opt_in=true and ai_processing_consent=true`)).rows
  for(const p of shares){await upsertKnowledgeDocument({sourceType:'sharing_post',sourceId:p.id,title:p.title,content:p.access_price_vnd>0?(p.description||''):([p.description,p.deliverables].filter(Boolean).join('. ')),preview:p.description,visibility:p.access_price_vnd>0?'paid_preview':'public',contributorId:p.host_id,universityId:p.university_id,courseId:p.course_id,provenance:`sharing/${p.id}`,evidenceType:'shared_material',authority:'student_experience',confidence:.86,optIn:true},{autoApprove:true});synced++}
  return {synced}
}

export async function contributeSessionSummary(userId,{requestId,summary,optIn,aiProcessingConsent,anonymized=true}){
  const db=database();const row=(await db.query(`select r.id,r.university_id,r.course_id,r.title from requests r join matches m on m.request_id=r.id where r.id=$1 and (r.author_id=$2 or m.receiver_id=$2) and r.status='completed'`,[requestId,userId])).rows[0]
  if(!row)throw Object.assign(new Error('Chỉ thành viên phiên đã hoàn tất được đóng góp tóm tắt.'),{status:403})
  await db.query(`insert into session_knowledge_consents(request_id,user_id,summary,opt_in,ai_processing_consent,anonymized) values($1,$2,$3,$4,$5,$6) on conflict(request_id,user_id) do update set summary=excluded.summary,opt_in=excluded.opt_in,ai_processing_consent=excluded.ai_processing_consent,anonymized=excluded.anonymized`,[requestId,userId,clean(summary),Boolean(optIn),Boolean(aiProcessingConsent),Boolean(anonymized)])
  const consents=(await db.query(`select * from session_knowledge_consents where request_id=$1 and opt_in=true and ai_processing_consent=true`,[requestId])).rows
  if(consents.length<2)return {pendingOtherPartyConsent:true}
  return upsertKnowledgeDocument({sourceType:'session_summary',sourceId:requestId,title:`Tóm tắt phiên: ${row.title}`,content:consents.map(x=>x.summary).join(' '),contributorId:userId,universityId:row.university_id,courseId:row.course_id,provenance:`session:${requestId}`,evidenceType:'session_summary',authority:'student_experience',confidence:.85,optIn:true,anonymized:consents.every(x=>x.anonymized)},{autoApprove:false})
}

export async function withdrawKnowledgeDocument(userId,id){const db=database();const result=await db.query(`update knowledge_documents set status='withdrawn',updated_at=now() where id=$1 and contributor_id=$2 returning id,status`,[id,userId]);if(!result.rowCount)throw Object.assign(new Error('Không tìm thấy đóng góp hoặc bạn không có quyền.'),{status:404});await db.query('delete from knowledge_chunks where document_id=$1',[id]);return result.rows[0]}
export async function setKnowledgeOptIn(userId,{sourceType,sourceId,optIn,aiProcessingConsent}){const db=database();const config=sourceType==='forum_post'?{table:'posts',owner:'author_id'}:sourceType==='forum_comment'?{table:'comments',owner:'author_id'}:sourceType==='sharing_post'?{table:'sharing_posts',owner:'host_id'}:null;if(!config)throw Object.assign(new Error('Loại nội dung không hỗ trợ.'),{status:422});if(optIn&&!aiProcessingConsent)throw Object.assign(new Error('Cần đồng ý rõ việc xử lý nội dung bằng dịch vụ AI để tạo embedding.'),{status:422});const row=(await db.query(`update ${config.table} set knowledge_opt_in=$3,ai_processing_consent=$4 where id=$1 and ${config.owner}=$2 returning id,knowledge_opt_in,ai_processing_consent`,[sourceId,userId,Boolean(optIn),Boolean(aiProcessingConsent)])).rows[0];if(!row)throw Object.assign(new Error('Không tìm thấy nội dung hoặc bạn không có quyền.'),{status:404});if(!optIn){const doc=(await db.query(`update knowledge_documents set status='withdrawn',updated_at=now() where source_type=$1 and source_id=$2 returning id`,[sourceType,String(sourceId)])).rows[0];if(doc)await db.query('delete from knowledge_chunks where document_id=$1',[doc.id])}else await syncCommunityKnowledge();return row}
export async function listMyKnowledgeDocuments(userId){const db=database();return db?(await db.query(`select id,source_type,title,visibility,status,opt_in,anonymized,version,created_at,updated_at from knowledge_documents where contributor_id=$1 order by updated_at desc`,[userId])).rows:[]}
export async function reviewKnowledgeDocument(id,status){if(!['approved','rejected'].includes(status))throw Object.assign(new Error('Quyết định không hợp lệ.'),{status:422});const db=database();const row=(await db.query(`update knowledge_documents set status=$2,updated_at=now() where id=$1 and status='pending' returning *`,[id,status])).rows[0];if(!row)throw Object.assign(new Error('Không tìm thấy đóng góp đang chờ.'),{status:404});if(status==='approved')await indexKnowledgeDocument(id);return row}
export async function recordKnowledgeFeedback(userId,{queryId,useful,note}){
  const db=database(),client=await db.connect()
  try{await client.query('begin');const previous=(await client.query(`select useful from knowledge_feedback where query_id=$1 and user_id=$2 for update`,[queryId,userId])).rows[0];const row=(await client.query(`insert into knowledge_feedback(query_id,user_id,useful,note) values($1,$2,$3,$4) on conflict(query_id,user_id) do update set useful=excluded.useful,note=excluded.note returning *`,[queryId,userId,Boolean(useful),clean(note)])).rows[0];if(useful&&!previous?.useful)await client.query(`update user_reputation_stats s set knowledge_contribution_points=knowledge_contribution_points+1 from knowledge_citations c where c.query_id=$1 and c.contributor_id=s.user_id`,[queryId]);if(!useful&&previous?.useful)await client.query(`update user_reputation_stats s set knowledge_contribution_points=greatest(0,knowledge_contribution_points-1) from knowledge_citations c where c.query_id=$1 and c.contributor_id=s.user_id`,[queryId]);await client.query('commit');return row}catch(error){await client.query('rollback');throw error}finally{client.release()}
}
export async function knowledgeDemandDashboard(){const db=database();if(!db)return {gaps:[],demand:[],contributors:[],pending:[]};const [gaps,demand,contributors,pending]=await Promise.all([db.query(`select * from knowledge_gaps where status='open' order by occurrences desc,last_asked_at desc limit 50`),db.query(`select university_id,course_id,date_trunc('week',created_at) week,count(*) queries,count(*) filter(where matched) answered from knowledge_queries group by 1,2,3 order by week desc,queries desc limit 100`),db.query(`select u.id,u.display_name,s.knowledge_contribution_points,count(c.id)::int citations from user_reputation_stats s join users u on u.id=s.user_id left join knowledge_citations c on c.contributor_id=u.id group by u.id,s.knowledge_contribution_points order by s.knowledge_contribution_points desc,citations desc limit 25`),db.query(`select id,title,source_type,evidence_type,authority,anonymized,created_at from knowledge_documents where status='pending' order by created_at limit 50`)]);return {gaps:gaps.rows,demand:demand.rows,contributors:contributors.rows,pending:pending.rows}}
export async function expireKnowledgeDocuments(){const db=database();if(!db)return {expired:0};const rows=(await db.query(`update knowledge_documents set status='expired',updated_at=now() where status='approved' and expires_at<=now() returning id`)).rows;if(rows.length)await db.query(`delete from knowledge_chunks where document_id=any($1::uuid[])`,[rows.map(x=>x.id)]);return {expired:rows.length}}
