import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireModerator } from '../middleware/admin.js'
import { contributeSessionSummary,knowledgeDemandDashboard,listMyKnowledgeDocuments,recordKnowledgeFeedback,reviewKnowledgeDocument,setKnowledgeOptIn,withdrawKnowledgeDocument } from '../services/knowledgeLifecycleService.js'
const router=Router()
router.post('/feedback',requireAuth,async(req,res,next)=>{try{res.status(201).json({data:await recordKnowledgeFeedback(req.auth.sub,req.body)})}catch(e){next(e)}})
router.get('/mine',requireAuth,async(req,res,next)=>{try{res.json({data:await listMyKnowledgeDocuments(req.auth.sub)})}catch(e){next(e)}})
router.post('/session-summaries',requireAuth,async(req,res,next)=>{try{res.status(201).json({data:await contributeSessionSummary(req.auth.sub,req.body)})}catch(e){next(e)}})
router.post('/opt-in',requireAuth,async(req,res,next)=>{try{res.json({data:await setKnowledgeOptIn(req.auth.sub,req.body)})}catch(e){next(e)}})
router.post('/:id/withdraw',requireAuth,async(req,res,next)=>{try{res.json({data:await withdrawKnowledgeDocument(req.auth.sub,req.params.id)})}catch(e){next(e)}})
router.get('/admin/demand',requireAuth,requireModerator,async(req,res,next)=>{try{res.json({data:await knowledgeDemandDashboard()})}catch(e){next(e)}})
router.post('/admin/:id/review',requireAuth,requireModerator,async(req,res,next)=>{try{res.json({data:await reviewKnowledgeDocument(req.params.id,req.body.status)})}catch(e){next(e)}})
export default router
