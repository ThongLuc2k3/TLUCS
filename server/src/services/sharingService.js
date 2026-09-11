import crypto from 'node:crypto'
import { database } from '../db/connection.js'
import { calculateSharingHostDeposit,reviewContentAccessPrice } from '../config/policies.js'
import { screenText } from './moderationService.js'
import { distributeSharingHostDeposit,freezeSharingAccess,holdSharingAccess,holdSharingHostDeposit,refundSharingAccess,releaseSharingAccess } from './walletService.js'
import { addConversationMember,createSharingConversation } from './conversationService.js'
export const demoPosts=[
  {id:'share-ai',host_id:'demo-host',display_name:'minhanh.fit',university_code:'HCMUS',format:'instant_unlock',title:'Cách mình ôn đạt 10 điểm Cơ sở AI',description:'Bộ ghi chú và checklist ôn tập cá nhân.',deliverables:'PDF 18 trang và checklist trước kỳ thi.',content_format:'PDF',content_extent:'18 trang',access_price_vnd:10000,status:'published',verified_claim:true,created_at:new Date().toISOString(),keywords:['AI','Ôn thi']},
  {id:'share-intern',host_id:'demo-host-2',display_name:'linh.ds',university_code:'HCMUS',format:'scheduled_exchange',title:'Review lộ trình xin thực tập Data năm 3',description:'Buổi trao đổi nhóm về CV và cách tìm vị trí phù hợp.',deliverables:'Buổi trao đổi 60 phút và checklist CV.',content_format:'Trao đổi trực tuyến',content_extent:'60 phút',access_price_vnd:0,minimum_participants:2,capacity:8,starts_at:new Date(Date.now()+86400000).toISOString(),status:'published',created_at:new Date().toISOString(),keywords:['Thực tập','Data']},
]
export const demoMembers=[]
export function validateSharingInput(input={}){const errors={};if(!['instant_unlock','scheduled_exchange'].includes(input.format))errors.format='Định dạng không hợp lệ.';if(typeof input.title!=='string'||input.title.trim().length<10||input.title.trim().length>160)errors.title='Tiêu đề cần từ 10 đến 160 ký tự.';if(typeof input.description!=='string'||input.description.trim().length<20)errors.description='Mô tả cần ít nhất 20 ký tự.';if(input.accessPriceVnd!==undefined){const price=reviewContentAccessPrice(Number(input.accessPriceVnd));if(!price.valid)errors.accessPriceVnd=price.code}if(Number(input.accessPriceVnd)>0&&(!input.deliverables||!input.contentFormat||!input.contentExtent||!input.refundTerms))errors.preview='Bài trả phí phải mô tả đầy đủ nội dung nhận được, định dạng, dung lượng và hoàn tiền.';if(input.format==='scheduled_exchange'){if(!input.startsAt)errors.startsAt='Vui lòng chọn lịch.';if(!Number.isInteger(Number(input.capacity))||Number(input.capacity)<1)errors.capacity='Số chỗ không hợp lệ.';if(Number(input.minimumParticipants)<1||Number(input.minimumParticipants)>Number(input.capacity))errors.minimumParticipants='Số người tối thiểu không hợp lệ.'}return {valid:Object.keys(errors).length===0,errors}}
export async function listSharingPosts({format,q,universityId}={}){const db=database();if(!db)return demoPosts.filter(x=>x.status==='published'&&(!format||x.format===format)&&(!q||(x.title+x.description+x.keywords.join(' ')+x.university_code).toLowerCase().includes(q.toLowerCase())));const values=[];const where=[`sp.status='published'`];if(format){values.push(format);where.push(`sp.format=$${values.length}`)}if(universityId){values.push(universityId);where.push(`sp.university_id=$${values.length}`)}if(q){values.push(`%${q}%`);where.push(`(sp.title ilike $${values.length} or sp.description ilike $${values.length} or uni.code ilike $${values.length} or uni.name ilike $${values.length})`)}const {rows}=await db.query(`select sp.*,u.display_name,u.avatar_url,uni.code university_code from sharing_posts sp join users u on u.id=sp.host_id left join universities uni on uni.id=sp.university_id where ${where.join(' and ')} order by sp.created_at desc limit 50`,values);return rows}
export async function createSharingPost(userId,input){const valid=validateSharingInput(input);if(!valid.valid)throw Object.assign(new Error('Bài chia sẻ chưa hợp lệ.'),{status:422,code:'VALIDATION_ERROR',fields:valid.errors});const price=Number(input.accessPriceVnd||0);const priceReview=reviewContentAccessPrice(price);const moderation=screenText(input);const status=moderation.outcome==='publish'&&!priceReview.adminReviewRequired?'published':'moderation';const db=database();if(!db){const conversation=await createSharingConversation({hostId:userId});const post={id:crypto.randomUUID(),host_id:userId,display_name:'Bạn',conversation_id:conversation.id,format:input.format,title:input.title.trim(),description:input.description.trim(),deliverables:input.deliverables||null,content_format:input.contentFormat||null,content_extent:input.contentExtent||null,refund_terms:input.refundTerms||null,access_price_vnd:price,host_deposit_vnd:input.format==='scheduled_exchange'?calculateSharingHostDeposit(price):0,minimum_participants:input.minimumParticipants||null,capacity:input.capacity||null,starts_at:input.startsAt||null,status,created_at:new Date().toISOString(),keywords:input.keywords||[]};await holdSharingHostDeposit({hostId:userId,sharingPostId:post.id,amountVnd:post.host_deposit_vnd});demoPosts.unshift(post);return {...post,moderation,priceReview}}const client=await db.connect();try{await client.query('begin');const chat=await createSharingConversation({hostId:userId,client});const hostDeposit=input.format==='scheduled_exchange'?calculateSharingHostDeposit(price):0;const {rows}=await client.query(`insert into sharing_posts(host_id,university_id,course_id,conversation_id,format,title,description,deliverables,content_format,content_extent,refund_terms,access_price_vnd,host_deposit_vnd,minimum_participants,capacity,registration_deadline,status,starts_at,closes_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) returning *`,[userId,input.universityId||null,input.courseId||null,chat.id,input.format,input.title.trim(),input.description.trim(),input.deliverables||null,input.contentFormat||null,input.contentExtent||null,input.refundTerms||null,price,hostDeposit,input.minimumParticipants||null,input.capacity||null,input.registrationDeadline||null,status,input.startsAt||null,input.closesAt||null]);await holdSharingHostDeposit({client,hostId:userId,sharingPostId:rows[0].id,amountVnd:hostDeposit});await client.query('commit');return {...rows[0],moderation,priceReview}}catch(e){await client.query('rollback');throw e}finally{client.release()}}
export async function joinSharingPost(userId,postId){const db=database();if(!db){const post=demoPosts.find(x=>x.id===postId&&x.status==='published');if(!post)throw Object.assign(new Error('Bài chia sẻ không khả dụng.'),{status:404});if(post.host_id===userId)throw Object.assign(new Error('Bạn là người đăng bài này.'),{status:409});if(demoMembers.some(x=>x.sharing_post_id===postId&&x.user_id===userId))throw Object.assign(new Error('Bạn đã tham gia bài này.'),{status:409});const tx=await holdSharingAccess({buyerId:userId,hostId:post.host_id,sharingPostId:postId,amountVnd:post.access_price_vnd});await addConversationMember({conversationId:post.conversation_id,userId});const member={sharing_post_id:postId,user_id:userId,transaction_id:tx?.id||null,status:post.format==='instant_unlock'?'access_granted':'joined',access_granted_at:post.format==='instant_unlock'?new Date().toISOString():null,auto_release_at:tx?new Date(Date.now()+12*3600000).toISOString():null};demoMembers.push(member);return member}const client=await db.connect();try{await client.query('begin');const post=(await client.query(`select * from sharing_posts where id=$1 and status='published' for update`,[postId])).rows[0];if(!post)throw Object.assign(new Error('Bài chia sẻ không khả dụng.'),{status:404});if(post.host_id===userId)throw Object.assign(new Error('Bạn là người đăng bài này.'),{status:409});const count=await client.query(`select count(*)::int count from sharing_post_members where sharing_post_id=$1 and status not in ('cancelled','refunded')`,[postId]);if(post.capacity&&count.rows[0].count>=post.capacity)throw Object.assign(new Error('Bài chia sẻ đã đủ chỗ.'),{status:409,code:'CAPACITY_REACHED'});const tx=await holdSharingAccess({client,buyerId:userId,hostId:post.host_id,sharingPostId:postId,amountVnd:Number(post.access_price_vnd)});await addConversationMember({client,conversationId:post.conversation_id,userId});const {rows}=await client.query(`insert into sharing_post_members(sharing_post_id,user_id,transaction_id,status,access_granted_at,auto_release_at) values($1,$2,$3,$4,$5,$6) returning *`,[postId,userId,tx?.id||null,post.format==='instant_unlock'?'access_granted':'joined',post.format==='instant_unlock'?new Date():null,tx?new Date(Date.now()+12*3600000):null]);await client.query('commit');return rows[0]}catch(e){await client.query('rollback');throw e}finally{client.release()}}

export async function confirmSharingAccess(userId, postId) {
  const db = database()
  if (!db) {
    const member = demoMembers.find((item) => item.sharing_post_id === postId && item.user_id === userId)
    if (!member || !['access_granted', 'joined'].includes(member.status)) {
      throw Object.assign(new Error('Bạn chưa tham gia nội dung này hoặc giao dịch đã kết thúc.'), { status: 409 })
    }
    if (member.transaction_id) await releaseSharingAccess(postId, userId)
    member.status = 'completed'
    member.buyer_confirmed_at = new Date().toISOString()
    member.completed_at = member.buyer_confirmed_at
    return member
  }

  const member = (await db.query(
    `select m.*,sp.access_price_vnd from sharing_post_members m join sharing_posts sp on sp.id=m.sharing_post_id where m.sharing_post_id=$1 and m.user_id=$2`,
    [postId, userId],
  )).rows[0]
  if (!member || !['access_granted', 'joined'].includes(member.status)) {
    throw Object.assign(new Error('Bạn chưa tham gia nội dung này hoặc giao dịch đã kết thúc.'), { status: 409 })
  }
  if (member.transaction_id) await releaseSharingAccess(postId, userId)
  return (await db.query(
    `update sharing_post_members set status='completed',buyer_confirmed_at=now(),completed_at=now() where sharing_post_id=$1 and user_id=$2 returning *`,
    [postId, userId],
  )).rows[0]
}

export async function openSharingDispute(userId, postId, input = {}) {
  const allowedReasons = ['not_accessible', 'not_as_described', 'policy_violation']
  if (!allowedReasons.includes(input.reason) || typeof input.description !== 'string' || input.description.trim().length < 10) {
    throw Object.assign(new Error('Vui lòng chọn lý do và mô tả vấn đề ít nhất 10 ký tự.'), { status: 422 })
  }
  const db = database()
  if (!db) {
    const member = demoMembers.find((item) => item.sharing_post_id === postId && item.user_id === userId)
    if (!member?.transaction_id || !['access_granted', 'joined'].includes(member.status)) {
      throw Object.assign(new Error('Không thể mở tranh chấp cho lượt truy cập này.'), { status: 409 })
    }
    await freezeSharingAccess(postId, userId)
    member.status = 'disputed'
    member.dispute = { reason: input.reason, description: input.description.trim(), status: 'open' }
    return member.dispute
  }

  const client = await db.connect()
  try {
    await client.query('begin')
    const member = (await client.query(
      `select * from sharing_post_members where sharing_post_id=$1 and user_id=$2 for update`,
      [postId, userId],
    )).rows[0]
    if (!member?.transaction_id || !['access_granted', 'joined'].includes(member.status)) {
      throw Object.assign(new Error('Không thể mở tranh chấp cho lượt truy cập này.'), { status: 409 })
    }
    const dispute = (await client.query(
      `insert into sharing_access_disputes(sharing_post_id,buyer_id,transaction_id,reason,description) values($1,$2,$3,$4,$5) returning *`,
      [postId, userId, member.transaction_id, input.reason, input.description.trim()],
    )).rows[0]
    await client.query(
      `update transactions set status='disputed' where id=$1 and status='held'`,
      [member.transaction_id],
    )
    await client.query(
      `update sharing_post_members set status='disputed' where sharing_post_id=$1 and user_id=$2`,
      [postId, userId],
    )
    await client.query('commit')
    return dispute
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function releaseDueSharingAccesses() {
  const db = database()
  if (!db) return []
  const { rows } = await db.query(
    `select sharing_post_id,user_id from sharing_post_members where status in ('access_granted','joined') and transaction_id is not null and auto_release_at<=now()`,
  )
  const released = []
  for (const member of rows) {
    try {
      await releaseSharingAccess(member.sharing_post_id, member.user_id)
      await db.query(
        `update sharing_post_members set status='completed',completed_at=now() where sharing_post_id=$1 and user_id=$2 and status in ('access_granted','joined')`,
        [member.sharing_post_id, member.user_id],
      )
      released.push(member)
    } catch (error) {
      if (error.status !== 409) throw error
    }
  }
  return released
}

export async function cancelSharingParticipation(userId,postId){
  const db=database()
  if(!db){const member=demoMembers.find(x=>x.sharing_post_id===postId&&x.user_id===userId),post=demoPosts.find(x=>x.id===postId);if(!member||!post||['cancelled','refunded','completed'].includes(member.status))throw Object.assign(new Error('Lượt tham gia không thể hủy.'),{status:409});const now=Date.now(),deadline=new Date(post.registration_deadline||post.starts_at).getTime(),start=new Date(post.starts_at).getTime(),rate=now<=deadline?1:now<start ? .5 : 0;const result=member.transaction_id?await refundSharingAccess(postId,userId,rate):null;member.status=rate===1?'refunded':'cancelled';member.cancellation_timing=rate===1?'before_deadline':rate===.5?'after_deadline':'no_show';member.refunded_vnd=result?.refunded_vnd||0;return member}
  const member=(await db.query(`select m.*,sp.registration_deadline,sp.starts_at from sharing_post_members m join sharing_posts sp on sp.id=m.sharing_post_id where m.sharing_post_id=$1 and m.user_id=$2`,[postId,userId])).rows[0];if(!member||['cancelled','refunded','completed'].includes(member.status))throw Object.assign(new Error('Lượt tham gia không thể hủy.'),{status:409});const now=Date.now(),deadline=new Date(member.registration_deadline||member.starts_at).getTime(),start=new Date(member.starts_at).getTime(),rate=now<=deadline?1:now<start ? .5 : 0;const result=member.transaction_id?await refundSharingAccess(postId,userId,rate):null;return (await db.query(`update sharing_post_members set status=$3,cancelled_at=now(),cancellation_timing=$4,refunded_vnd=$5,host_compensation_vnd=$6 where sharing_post_id=$1 and user_id=$2 returning *`,[postId,userId,rate===1?'refunded':'cancelled',rate===1?'before_deadline':rate===.5?'after_deadline':'no_show',result?.refunded_vnd||0,result?.host_compensation_vnd||0])).rows[0]
}

export async function cancelSharingPost(hostId,postId,reason='Chủ bài hủy buổi'){
  const db=database()
  if(!db){const post=demoPosts.find(x=>x.id===postId&&x.host_id===hostId&&x.format==='scheduled_exchange');if(!post||post.status!=='published')throw Object.assign(new Error('Buổi chia sẻ không thể hủy.'),{status:409});const members=demoMembers.filter(x=>x.sharing_post_id===postId&&!['cancelled','refunded'].includes(x.status));for(const member of members){if(member.transaction_id)await refundSharingAccess(postId,member.user_id,1);member.status='refunded'}await distributeSharingHostDeposit(hostId,postId,post.host_deposit_vnd,members.map(x=>x.user_id));post.status='cancelled';post.cancellation_reason=reason;return post}
  const post=(await db.query(`select * from sharing_posts where id=$1 and host_id=$2 and format='scheduled_exchange'`,[postId,hostId])).rows[0];if(!post||!['published','scheduled'].includes(post.status))throw Object.assign(new Error('Buổi chia sẻ không thể hủy.'),{status:409});const members=(await db.query(`select * from sharing_post_members where sharing_post_id=$1 and status not in ('cancelled','refunded')`,[postId])).rows;for(const member of members)if(member.transaction_id)await refundSharingAccess(postId,member.user_id,1);await distributeSharingHostDeposit(hostId,postId,Number(post.host_deposit_vnd),members.map(x=>x.user_id));const client=await db.connect();try{await client.query('begin');await client.query(`update sharing_post_members set status='refunded',cancelled_at=now(),refunded_vnd=coalesce((select gross_vnd from transactions where id=transaction_id),0) where sharing_post_id=$1 and status not in ('cancelled','refunded')`,[postId]);const result=(await client.query(`update sharing_posts set status='cancelled' where id=$1 returning *`,[postId])).rows[0];await client.query(`insert into sharing_post_events(sharing_post_id,actor_id,event_type,affects_reputation,metadata) values($1,$2,'host_cancelled',true,$3)`,[postId,hostId,JSON.stringify({reason})]);await client.query(`insert into user_policy_strikes(user_id,policy_code,source_type,source_id) values($1,'sharing_host_cancel','sharing_post',$2)`,[hostId,postId]);const count=Number((await client.query(`select count(*) count from user_policy_strikes where user_id=$1 and policy_code='sharing_host_cancel' and created_at>=now()-interval '30 days'`,[hostId])).rows[0].count);if(count>=3)await client.query(`insert into user_feature_restrictions(user_id,feature,reason,ends_at) values($1,'paid_sharing_create','Ba lần hủy trong 30 ngày',now()+interval '7 days')`,[hostId]);await client.query('commit');return result}catch(error){await client.query('rollback');throw error}finally{client.release()}
}

export async function reviewSharing(userId,postId,input={}){
  const contentRating=Number(input.contentRating),hostRating=Number(input.hostRating);if(!Number.isInteger(contentRating)||contentRating<1||contentRating>5||!Number.isInteger(hostRating)||hostRating<1||hostRating>5)throw Object.assign(new Error('Điểm nội dung và người chia sẻ phải từ 1 đến 5.'),{status:422});const db=database();const post=!db?demoPosts.find(x=>x.id===postId):(await db.query('select * from sharing_posts where id=$1',[postId])).rows[0];const member=!db?demoMembers.find(x=>x.sharing_post_id===postId&&x.user_id===userId):(await db.query('select * from sharing_post_members where sharing_post_id=$1 and user_id=$2',[postId,userId])).rows[0];if(!post||!member||member.status!=='completed')throw Object.assign(new Error('Chỉ được đánh giá sau khi hoàn tất.'),{status:403});const record={id:crypto.randomUUID(),sharing_post_id:postId,reviewer_id:userId,host_id:post.host_id,content_rating:contentRating,host_rating:hostRating,content_comment:String(input.contentComment||'').slice(0,1000),host_comment:String(input.hostComment||'').slice(0,1000),created_at:new Date().toISOString()};if(!db)return record;return (await db.query(`insert into sharing_reviews(sharing_post_id,reviewer_id,host_id,content_rating,host_rating,content_comment,host_comment) values($1,$2,$3,$4,$5,$6,$7) on conflict(sharing_post_id,reviewer_id) do update set content_rating=excluded.content_rating,host_rating=excluded.host_rating,content_comment=excluded.content_comment,host_comment=excluded.host_comment returning *`,[postId,userId,post.host_id,contentRating,hostRating,record.content_comment||null,record.host_comment||null])).rows[0]
}

export async function createSharingPostChecked(userId,input){
  const db=database(),price=Number(input.accessPriceVnd||0)
  if(price>0&&input.ownsOrCanDistribute===false)throw Object.assign(new Error('Bạn phải có quyền chia sẻ nội dung.'),{status:422,code:'CONTENT_RIGHTS_REQUIRED'})
  if(db&&price>0){const active=await db.query(`select 1 from user_feature_restrictions where user_id=$1 and feature='paid_sharing_create' and (ends_at is null or ends_at>now()) limit 1`,[userId]);if(active.rowCount)throw Object.assign(new Error('Tài khoản đang tạm khóa tạo bài chia sẻ trả phí.'),{status:403,code:'FEATURE_RESTRICTED'})}
  const post=await createSharingPost(userId,input)
  if(db&&price>0)await db.query(`insert into content_rights_acceptances(sharing_post_id,user_id,terms_version,owns_or_can_distribute,personal_use_only_acknowledged) values($1,$2,'mvp-1',true,true) on conflict(sharing_post_id) do nothing`,[post.id,userId])
  return post
}
