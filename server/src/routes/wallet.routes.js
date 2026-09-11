import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { demoTopup,demoWithdraw,getWallet,payRemaining,releaseTransaction } from '../services/walletService.js'
import { waitForPaymentSimulation } from '../services/paymentSimulation.js'
import { createTopup,createWithdrawal,getPaymentOverview,paymentConfig,savePayoutAccount } from '../services/manualPaymentService.js'
const router=Router();router.use(requireAuth)
router.get('/',async(req,res,next)=>{try{res.json({data:await getWallet(req.auth.sub)})}catch(e){next(e)}})
router.get('/payment-config',(req,res)=>res.json({data:paymentConfig()}))
router.get('/cash-requests',async(req,res,next)=>{try{res.json({data:await getPaymentOverview(req.auth.sub)})}catch(e){next(e)}})
router.put('/payout-account',async(req,res,next)=>{try{res.json({data:await savePayoutAccount(req.auth.sub,req.body)})}catch(e){next(e)}})
router.post('/topup-requests',async(req,res,next)=>{try{res.status(201).json({data:await createTopup(req.auth.sub,req.body)})}catch(e){next(e)}})
router.post('/withdrawal-requests',async(req,res,next)=>{try{res.status(201).json({data:await createWithdrawal(req.auth.sub,req.body)})}catch(e){next(e)}})
router.post('/demo-topup',async(req,res,next)=>{try{await waitForPaymentSimulation();res.json({data:await demoTopup(req.auth.sub,Number(req.body.amountVnd)),simulation:true})}catch(e){next(e)}})
router.post('/demo-withdraw',async(req,res,next)=>{try{await waitForPaymentSimulation();res.json({data:await demoWithdraw(req.auth.sub,Number(req.body.amountVnd)),simulation:true})}catch(e){next(e)}})
router.post('/requests/:id/pay',async(req,res,next)=>{try{await waitForPaymentSimulation();res.json({data:await payRemaining(req.auth.sub,req.params.id),simulation:true})}catch(e){next(e)}})
router.post('/requests/:id/release',async(req,res,next)=>{try{res.json({data:await releaseTransaction(req.params.id,req.auth.sub)})}catch(e){next(e)}})
export default router
