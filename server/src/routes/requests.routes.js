import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { acceptRequest,createRequest,listAuthoredRequests,listRequests,recommendRequests,selectApplication } from '../services/requestService.js'
import { waitForPaymentSimulation } from '../services/paymentSimulation.js'
const router=Router()
router.get('/',async(req,res,next)=>{try{res.json({data:await listRequests({q:req.query.q,kind:req.query.kind,universityId:req.query.universityId,timeRange:req.query.timeRange,budget:req.query.budget})})}catch(e){next(e)}})
router.get('/recommended',requireAuth,async(req,res,next)=>{try{res.json({data:await recommendRequests(req.auth.sub)})}catch(e){next(e)}})
router.post('/',requireAuth,async(req,res,next)=>{try{if(req.body.kind==='paid')await waitForPaymentSimulation();res.status(201).json({data:await createRequest(req.auth.sub,req.body),simulation:req.body.kind==='paid'})}catch(e){next(e)}})
router.post('/:id/accept',requireAuth,async(req,res,next)=>{try{res.json(await acceptRequest(req.params.id,req.auth.sub))}catch(e){next(e)}})
router.get('/mine/authored',requireAuth,async(req,res,next)=>{try{res.json({data:await listAuthoredRequests(req.auth.sub)})}catch(e){next(e)}})
router.post('/:id/applications/:applicationId/select',requireAuth,async(req,res,next)=>{try{res.json({data:await selectApplication(req.auth.sub,req.params.id,req.params.applicationId)})}catch(e){next(e)}})
export default router
