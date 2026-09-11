import crypto from 'node:crypto'
import { database } from '../db/connection.js'
import { screenText } from './moderationService.js'
import { notify } from './notificationService.js'
import { applyGiftTransfer } from './walletService.js'
import { requestPolicy } from '../config/policies.js'
const demoPosts=[
  {id:'forum-ai',author_id:'demo-author-1',display_name:'hcmus.cat',university_code:'HCMUS',title:'Môn AI có cần học Xác suất trước không?',body:'Mình đang lên kế hoạch học kỳ tới, đã học Toán rời rạc nhưng phần xác suất còn yếu. Mọi người từng học cho mình xin kinh nghiệm nhé.',keywords:['HCMUS','Trí tuệ nhân tạo','Chọn môn'],reaction_count:18,comment_count:2,save_count:3,created_at:new Date().toISOString()},
  {id:'forum-home',author_id:'demo-author-2',display_name:'saigon.student',university_code:'HCMUS',title:'Kinh nghiệm tìm trọ quanh cơ sở Nguyễn Văn Cừ',body:'Mình tổng hợp vài khu vực dễ đi xe buýt, mức giá và những điều nên hỏi chủ trọ trước khi cọc.',keywords:['Nhà trọ','Quận 5'],reaction_count:31,comment_count:0,save_count:15,created_at:new Date(Date.now()-3600000).toISOString()},
]
const demoComments=[
  {id:'forum-comment-ai-1',post_id:'forum-ai',author_id:'demo-commenter-1',display_name:'minhanh.fit',parent_id:null,body:'Nếu phần Đại số tuyến tính ổn thì bạn có thể học song song, nhưng nên ôn xác suất có điều kiện trước.',moderation_status:'published',reaction_count:0,gift_count:0,gift_total_vnd:0,created_at:new Date(Date.now()-20*60000).toISOString()},
  {id:'forum-comment-ai-2',post_id:'forum-ai',author_id:'demo-commenter-2',display_name:'quanghuy.cs',parent_id:null,body:'Mình khuyên học chắc kỳ vọng và phân phối xác suất vì môn AI dùng lại khá nhiều.',moderation_status:'published',reaction_count:0,gift_count:0,gift_total_vnd:0,created_at:new Date(Date.now()-10*60000).toISOString()},
];const demoReactions=new Map();const demoCommentReactions=new Map();const demoSaves=new Set();const demoFollows=new Set()
export function validatePostInput(input={}){const errors={};if(typeof input.title!=='string'||input.title.trim().length<10||input.title.trim().length>160)errors.title='Tiêu đề cần từ 10 đến 160 ký tự.';if(typeof input.body!=='string'||input.body.trim().length<20||input.body.trim().length>10000)errors.body='Nội dung cần từ 20 đến 10.000 ký tự.';if(!Array.isArray(input.keywords)||input.keywords.length>8)errors.keywords='Tối đa 8 từ khóa.';return {valid:Object.keys(errors).length===0,errors}}
export async function listPosts({feed='latest',q='',universityId}={}){const db=database();if(!db){let result=demoPosts;if(q)result=result.filter(x=>(x.title+x.body+x.keywords.join(' ')+x.university_code).toLowerCase().includes(q.toLowerCase()));return [...result].sort((a,b)=>feed==='trending'?(b.reaction_count+b.comment_count)-(a.reaction_count+a.comment_count):new Date(b.created_at)-new Date(a.created_at))}const values=[];const where=[`p.moderation_status='published'`];if(universityId){values.push(universityId);where.push(`s.university_id=$${values.length}`)}if(q){values.push(`%${q}%`);where.push(`(p.title ilike $${values.length} or p.body ilike $${values.length} or uni.code ilike $${values.length} or uni.name ilike $${values.length})`)}const order=feed==='trending'?'coalesce(pm.trending_score,0) desc':'p.created_at desc';const {rows}=await db.query(`select p.*,u.display_name,u.avatar_url,uni.code university_code,coalesce(pm.reaction_count,0) reaction_count,coalesce(pm.comment_count,0) comment_count,coalesce(pm.save_count,0) save_count,coalesce(pm.gift_count,0) gift_count,coalesce(pm.gift_total_vnd,0) gift_total_vnd,array_remove(array_agg(pk.keyword),null) keywords from posts p join users u on u.id=p.author_id left join community_servers s on s.id=p.server_id left join universities uni on uni.id=s.university_id left join post_metrics pm on pm.post_id=p.id left join post_keywords pk on pk.post_id=p.id where ${where.join(' and ')} group by p.id,u.id,uni.code,pm.post_id order by ${order} limit 50`,values);return rows}
export async function createPost(userId,input){const valid=validatePostInput(input);if(!valid.valid)throw Object.assign(new Error('Bài viết chưa hợp lệ.'),{status:422,code:'VALIDATION_ERROR',fields:valid.errors});const moderation=screenText(input);const status=moderation.outcome==='publish'?'published':'screening';const post={id:crypto.randomUUID(),author_id:userId,display_name:'Bạn',server_id:input.serverId||null,title:input.title.trim(),body:input.body.trim(),keywords:input.keywords.map(x=>x.trim()).filter(Boolean),moderation_status:status,reaction_count:0,comment_count:0,save_count:0,created_at:new Date().toISOString()};const db=database();if(!db){demoPosts.unshift(post);return {...post,moderation}}const client=await db.connect();try{await client.query('begin');const row=(await client.query('insert into posts(author_id,server_id,title,body,moderation_status) values($1,$2,$3,$4,$5) returning *',[userId,input.serverId||null,post.title,post.body,status])).rows[0];for(const keyword of post.keywords)await client.query('insert into post_keywords(post_id,keyword) values($1,$2) on conflict do nothing',[row.id,keyword]);await client.query('insert into post_metrics(post_id) values($1)',[row.id]);const run=await client.query(`insert into moderation_runs(target_type,target_id,rules_version,outcome,confidence) values('post',$1,$2,$3,$4) returning id`,[row.id,moderation.rulesVersion,moderation.outcome,moderation.outcome==='publish'?1:.8]);for(const finding of moderation.findings)await client.query('insert into moderation_findings(run_id,source,code,severity) values($1,$2,$3,$4)',[run.rows[0].id,finding.source,finding.code,finding.severity]);await client.query('commit');return {...row,keywords:post.keywords,moderation}}catch(e){await client.query('rollback');throw e}finally{client.release()}}
export async function addComment(userId,postId,input){const body=input.body?.trim();if(!body||body.length>3000)throw Object.assign(new Error('Bình luận cần từ 1 đến 3.000 ký tự.'),{status:422});const parentId=input.parentId||null;const moderation=screenText({description:body});const status=moderation.outcome==='publish'?'published':'screening';const db=database();if(!db){if(parentId&&!demoComments.some(x=>x.id===parentId&&x.post_id===postId))throw Object.assign(new Error('Không tìm thấy bình luận gốc.'),{status:404});const comment={id:crypto.randomUUID(),post_id:postId,author_id:userId,display_name:'Bạn',parent_id:parentId,body,moderation_status:status,reaction_count:0,gift_count:0,gift_total_vnd:0,created_at:new Date().toISOString()};demoComments.push(comment);const post=demoPosts.find(x=>x.id===postId);if(post&&status==='published')post.comment_count++;return {...comment,moderation}}if(parentId){const parent=(await db.query('select 1 from comments where id=$1 and post_id=$2',[parentId,postId])).rowCount;if(!parent)throw Object.assign(new Error('Không tìm thấy bình luận gốc.'),{status:404})}const {rows}=await db.query('insert into comments(post_id,author_id,parent_id,body,moderation_status) values($1,$2,$3,$4,$5) returning *',[postId,userId,parentId,body,status]);if(status==='published')await db.query('update post_metrics set comment_count=comment_count+1,updated_at=now() where post_id=$1',[postId]);return {...rows[0],moderation}}
export async function listComments(postId){const db=database();if(!db)return demoComments.filter(x=>x.post_id===postId&&x.moderation_status==='published');return (await db.query(`select c.*,u.display_name,u.avatar_url from comments c join users u on u.id=c.author_id where c.post_id=$1 and c.moderation_status='published' order by c.created_at`,[postId])).rows}
export async function react(userId,postId,reaction='like'){const db=database();if(!db){const key=`${userId}:${postId}`;const existed=demoReactions.has(key);if(existed)demoReactions.delete(key);else demoReactions.set(key,reaction);const post=demoPosts.find(x=>x.id===postId);if(post)post.reaction_count+=existed?-1:1;return {active:!existed,reaction}}const client=await db.connect();try{await client.query('begin');const existing=await client.query(`select id from reactions where user_id=$1 and target_type='post' and target_id=$2`,[userId,postId]);if(existing.rowCount)await client.query('delete from reactions where id=$1',[existing.rows[0].id]);else await client.query(`insert into reactions(user_id,target_type,target_id,reaction) values($1,'post',$2,$3)`,[userId,postId,reaction]);await client.query('update post_metrics set reaction_count=greatest(0,reaction_count+$2),updated_at=now() where post_id=$1',[postId,existing.rowCount?-1:1]);await client.query('commit');return {active:!existing.rowCount,reaction}}catch(e){await client.query('rollback');throw e}finally{client.release()}}
export async function reactComment(userId,commentId,reaction='like'){const db=database();if(!db){const key=`${userId}:${commentId}`;const existed=demoCommentReactions.has(key);if(existed)demoCommentReactions.delete(key);else demoCommentReactions.set(key,reaction);const comment=demoComments.find(x=>x.id===commentId);if(comment)comment.reaction_count=Math.max(0,(comment.reaction_count||0)+(existed?-1:1));return {active:!existed,reaction}}const client=await db.connect();try{await client.query('begin');const existing=await client.query(`select id from reactions where user_id=$1 and target_type='comment' and target_id=$2`,[userId,commentId]);if(existing.rowCount)await client.query('delete from reactions where id=$1',[existing.rows[0].id]);else await client.query(`insert into reactions(user_id,target_type,target_id,reaction) values($1,'comment',$2,$3)`,[userId,commentId,reaction]);await client.query('update comments set reaction_count=greatest(0,reaction_count+$2) where id=$1',[commentId,existing.rowCount?-1:1]);await client.query('commit');return {active:!existing.rowCount,reaction}}catch(e){await client.query('rollback');throw e}finally{client.release()}}
export async function toggleCollection(userId,postId,type){const db=database();const store=type==='save'?demoSaves:demoFollows;const table=type==='save'?'saved_posts':'post_follows';if(!db){const key=`${userId}:${postId}`;if(store.has(key)){store.delete(key);return {active:false}}store.add(key);return {active:true}}const existing=await db.query(`select 1 from ${table} where user_id=$1 and post_id=$2`,[userId,postId]);if(existing.rowCount){await db.query(`delete from ${table} where user_id=$1 and post_id=$2`,[userId,postId]);return {active:false}}await db.query(`insert into ${table}(user_id,post_id) values($1,$2)`,[userId,postId]);return {active:true}}

export async function sendGift(senderId,postId,amountVnd){
  const amount=Number(amountVnd)
  if(!requestPolicy.giftTiersVnd.includes(amount))throw Object.assign(new Error('Mức quà tặng không hợp lệ.'),{status:422,code:'INVALID_GIFT_TIER'})
  const giftNotice={kind:'gift',title:'Bạn vừa nhận được quà tặng',body:`Ai đó đã tặng bạn ${amount.toLocaleString('vi-VN')}đ cho bài viết trên diễn đàn.`,actionUrl:'/dien-dan'}
  const db=database()
  if(!db){
    const post=demoPosts.find(x=>x.id===postId)
    if(!post)throw Object.assign(new Error('Không tìm thấy bài viết.'),{status:404})
    if(post.author_id===senderId)throw Object.assign(new Error('Bạn không thể tự tặng quà cho bài của mình.'),{status:409})
    const {fee,payout}=await applyGiftTransfer({senderId,recipientId:post.author_id,amountVnd:amount})
    post.gift_count=(post.gift_count||0)+1
    post.gift_total_vnd=(post.gift_total_vnd||0)+amount
    await notify(post.author_id,giftNotice)
    return {postId,amountVnd:amount,feeVnd:fee,payoutVnd:payout,giftCount:post.gift_count,giftTotalVnd:post.gift_total_vnd}
  }
  const client=await db.connect()
  try{
    await client.query('begin')
    const post=(await client.query('select id,author_id from posts where id=$1 for update',[postId])).rows[0]
    if(!post)throw Object.assign(new Error('Không tìm thấy bài viết.'),{status:404})
    if(post.author_id===senderId)throw Object.assign(new Error('Bạn không thể tự tặng quà cho bài của mình.'),{status:409})
    const {fee,payout}=await applyGiftTransfer({client,senderId,recipientId:post.author_id,amountVnd:amount})
    const gift=(await client.query('insert into post_gifts(post_id,sender_id,recipient_id,amount_vnd,fee_vnd,payout_vnd) values($1,$2,$3,$4,$5,$6) returning *',[postId,senderId,post.author_id,amount,fee,payout])).rows[0]
    await client.query('update post_metrics set gift_count=gift_count+1,gift_total_vnd=gift_total_vnd+$2,updated_at=now() where post_id=$1',[postId,amount])
    await client.query('commit')
    await notify(post.author_id,giftNotice)
    return {...gift,postId}
  }catch(error){await client.query('rollback');throw error}finally{client.release()}
}

export async function sendCommentGift(senderId,commentId,amountVnd){
  const amount=Number(amountVnd)
  if(!requestPolicy.giftTiersVnd.includes(amount))throw Object.assign(new Error('Mức quà tặng không hợp lệ.'),{status:422,code:'INVALID_GIFT_TIER'})
  const giftNotice={kind:'gift',title:'Bạn vừa nhận được quà tặng',body:`Ai đó đã tặng bạn ${amount.toLocaleString('vi-VN')}đ cho một bình luận trên diễn đàn.`,actionUrl:'/dien-dan'}
  const db=database()
  if(!db){
    const comment=demoComments.find(x=>x.id===commentId)
    if(!comment)throw Object.assign(new Error('Không tìm thấy bình luận.'),{status:404})
    if(comment.author_id===senderId)throw Object.assign(new Error('Bạn không thể tự tặng quà cho bình luận của mình.'),{status:409})
    const {fee,payout}=await applyGiftTransfer({senderId,recipientId:comment.author_id,amountVnd:amount})
    comment.gift_count=(comment.gift_count||0)+1
    comment.gift_total_vnd=(comment.gift_total_vnd||0)+amount
    await notify(comment.author_id,giftNotice)
    return {commentId,amountVnd:amount,feeVnd:fee,payoutVnd:payout,giftCount:comment.gift_count,giftTotalVnd:comment.gift_total_vnd}
  }
  const client=await db.connect()
  try{
    await client.query('begin')
    const comment=(await client.query('select id,author_id from comments where id=$1 for update',[commentId])).rows[0]
    if(!comment)throw Object.assign(new Error('Không tìm thấy bình luận.'),{status:404})
    if(comment.author_id===senderId)throw Object.assign(new Error('Bạn không thể tự tặng quà cho bình luận của mình.'),{status:409})
    const {fee,payout}=await applyGiftTransfer({client,senderId,recipientId:comment.author_id,amountVnd:amount})
    const gift=(await client.query('insert into post_gifts(comment_id,sender_id,recipient_id,amount_vnd,fee_vnd,payout_vnd) values($1,$2,$3,$4,$5,$6) returning *',[commentId,senderId,comment.author_id,amount,fee,payout])).rows[0]
    await client.query('update comments set gift_count=gift_count+1,gift_total_vnd=gift_total_vnd+$2 where id=$1',[commentId,amount])
    await client.query('commit')
    await notify(comment.author_id,giftNotice)
    return {...gift,commentId}
  }catch(error){await client.query('rollback');throw error}finally{client.release()}
}
