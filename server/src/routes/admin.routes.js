import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin,requireModerator } from '../middleware/admin.js'
import { dashboard,listAudit,listContent,listDisputes,listTransactions,listUsers,resolveDispute,softDeleteContent,softDeleteUser,updateUser } from '../services/adminService.js'
import { listCashRequests,reviewCashRequest } from '../services/manualPaymentService.js'
const router=Router();router.use(requireAuth,requireModerator,requireAdmin)
router.get('/me',(req,res)=>res.json({data:req.admin}))
router.get('/dashboard',async(req,res,next)=>{try{res.json({data:await dashboard()})}catch(e){next(e)}})
router.get('/users',async(req,res,next)=>{try{res.json({data:await listUsers(req.query)})}catch(e){next(e)}})
router.patch('/users/:id',async(req,res,next)=>{try{res.json({data:await updateUser(req.admin,{id:req.params.id,...req.body})})}catch(e){next(e)}})
router.post('/users/:id/delete',async(req,res,next)=>{try{res.json({data:await softDeleteUser(req.admin,req.params.id,req.body.reason,false)})}catch(e){next(e)}})
router.post('/users/:id/restore',async(req,res,next)=>{try{res.json({data:await softDeleteUser(req.admin,req.params.id,req.body.reason,true)})}catch(e){next(e)}})
router.get('/content/:type',async(req,res,next)=>{try{res.json({data:await listContent(req.params.type,req.query)})}catch(e){next(e)}})
router.post('/content/:type/:id/delete',async(req,res,next)=>{try{res.json({data:await softDeleteContent(req.admin,req.params.type,req.params.id,req.body.reason,false)})}catch(e){next(e)}})
router.post('/content/:type/:id/restore',async(req,res,next)=>{try{res.json({data:await softDeleteContent(req.admin,req.params.type,req.params.id,req.body.reason,true)})}catch(e){next(e)}})
router.get('/transactions',async(req,res,next)=>{try{res.json({data:await listTransactions(req.query)})}catch(e){next(e)}})
router.get('/cash-requests',async(req,res,next)=>{try{res.json({data:await listCashRequests()})}catch(e){next(e)}})
router.post('/cash-requests/:id/review',async(req,res,next)=>{try{res.json({data:await reviewCashRequest(req.admin,req.params.id,req.body)})}catch(e){next(e)}})
router.get('/disputes',async(req,res,next)=>{try{res.json({data:await listDisputes()})}catch(e){next(e)}})
router.post('/disputes/:id/resolve',async(req,res,next)=>{try{res.json({data:await resolveDispute(req.admin,req.params.id,req.body)})}catch(e){next(e)}})
router.get('/audit',async(req,res,next)=>{try{res.json({data:await listAudit()})}catch(e){next(e)}})
export default router
