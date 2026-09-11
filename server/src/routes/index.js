import { Router } from 'express'
import { database } from '../db/connection.js'
import authRoutes from './auth.routes.js'
import requestRoutes from './requests.routes.js'
import walletRoutes from './wallet.routes.js'
import knowledgeRoutes from './knowledge.routes.js'
import conversationRoutes from './conversations.routes.js'
import forumRoutes from './forum.routes.js'
import sharingRoutes from './sharing.routes.js'
import communityRoutes from './community.routes.js'
import notificationRoutes from './notifications.routes.js'
import sessionRoutes from './sessions.routes.js'
import operationsRoutes from './operations.routes.js'
import searchRoutes from './search.routes.js'
import materialRoutes from './materials.routes.js'
import socialRoutes from './social.routes.js'
import assistantRoutes from './assistant.routes.js'
import adminRoutes from './admin.routes.js'
const router=Router()
router.use('/auth',authRoutes)
router.use('/requests',requestRoutes)
router.use('/wallet',walletRoutes)
router.use('/knowledge',knowledgeRoutes)
router.use('/conversations',conversationRoutes)
router.use('/forum',forumRoutes)
router.use('/sharing',sharingRoutes)
router.use('/community',communityRoutes)
router.use('/notifications',notificationRoutes)
router.use('/sessions',sessionRoutes)
router.use('/operations',operationsRoutes)
router.use('/search',searchRoutes)
router.use('/sharing-access',materialRoutes)
router.use('/social',socialRoutes)
router.use('/assistant',assistantRoutes)
router.use('/admin',adminRoutes)
const fallbackUniversities=[
  {id:'hcmus',code:'HCMUS',name:'Trường Đại học Khoa học Tự nhiên – ĐHQG TP.HCM',pilot:true},
  {id:'hcmut',code:'HCMUT',name:'Trường Đại học Bách khoa – ĐHQG TP.HCM',pilot:false},
  {id:'uel',code:'UEL',name:'Trường Đại học Kinh tế – Luật – ĐHQG TP.HCM',pilot:false},
]
const fallbackTopics=[{id:'mon-hoc',name:'Môn học và ôn tập'},{id:'thuc-tap',name:'Thực tập và nghề nghiệp'},{id:'cau-lac-bo',name:'Câu lạc bộ và hoạt động'},{id:'hoc-bong',name:'Học bổng'},{id:'ky-tuc-xa',name:'Ký túc xá và nhà trọ'}]
router.get('/health',async(req,res)=>{const db=database();let dbStatus='not_configured';if(db){try{await db.query('select 1');dbStatus='connected'}catch{dbStatus='unavailable'}}res.json({service:'tlucs-api',status:'ok',database:dbStatus})})
router.get('/universities',async(req,res)=>{const db=database();if(!db)return res.json({data:fallbackUniversities,source:'demo'});const {rows}=await db.query('select id, code, name, is_pilot as pilot from universities where status = $1 order by is_pilot desc, name',['active']);res.json({data:rows})})
router.get('/topics',async(req,res)=>{const db=database();if(!db)return res.json({data:fallbackTopics,source:'demo'});const {rows}=await db.query('select id,slug,name,category from topics where active=true order by category,name');res.json({data:rows})})
router.get('/request-types',(req,res)=>res.json({data:[{id:'free',label:'Miễn phí'},{id:'paid',label:'Trả phí'},{id:'exchange',label:'Trao đổi'}]}))
export default router
