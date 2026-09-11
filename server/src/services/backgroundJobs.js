import { database } from '../db/connection.js'
import { cancelSharingPost,releaseDueSharingAccesses } from './sharingService.js'
import { cancelOverdueRequestPayments,releaseDueRequestTransactions } from './walletService.js'
import { expireKnowledgeDocuments,syncCommunityKnowledge } from './knowledgeLifecycleService.js'
let running=false
export async function runBackgroundJobs(){
  if(running)return;running=true
  try{
    await Promise.all([releaseDueSharingAccesses(),releaseDueRequestTransactions(),cancelOverdueRequestPayments(),syncCommunityKnowledge(),expireKnowledgeDocuments()])
    const db=database()
    if(db){
      const {rows}=await db.query(`select sp.id,sp.host_id from sharing_posts sp where sp.format='scheduled_exchange' and sp.status='published' and sp.registration_deadline<=now() and (select count(*) from sharing_post_members m where m.sharing_post_id=sp.id and m.status not in ('cancelled','refunded'))<coalesce(sp.minimum_participants,1)`)
      for(const post of rows)await cancelSharingPost(post.host_id,post.id,'Không đủ số người tối thiểu trước hạn đăng ký')
      await db.query(`update requests r set status='completed' where r.kind<>'paid' and r.status in ('matched','scheduled') and r.starts_at+(r.duration_minutes||' minutes')::interval+interval '12 hours'<=now() and not exists(select 1 from disputes d join transactions t on t.id=d.transaction_id where t.request_id=r.id and d.status='open')`)
    }
  }finally{running=false}
}
export function startBackgroundJobs(){const timer=setInterval(()=>runBackgroundJobs().catch(error=>console.error('TLUCS background job failed',error)),60000);timer.unref?.();runBackgroundJobs().catch(error=>console.error('TLUCS background job failed',error));return timer}
