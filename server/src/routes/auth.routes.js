import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { completeOnboarding,getUser,loginAdmin,loginDev,loginWithGoogle,loginWithPassword,refreshSession,registerWithPassword } from '../services/authService.js'
import { validateOnboarding } from '../services/onboardingPolicy.js'
import { requireAuth } from '../middleware/auth.js'
const router=Router();const meta=req=>({userAgent:req.get('user-agent'),ip:req.ip})
const loginLimiter=rateLimit({windowMs:10*60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,message:{error:{code:'LOGIN_RATE_LIMITED',message:'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.'}}})
router.post('/google',loginLimiter,async(req,res,next)=>{try{res.json(await loginWithGoogle(req.body.credential,meta(req)))}catch(e){next(e)}})
router.post('/admin',loginLimiter,async(req,res,next)=>{try{res.json(await loginAdmin(req.body.email,req.body.password,meta(req)))}catch(e){next(e)}})
router.post('/register',loginLimiter,async(req,res,next)=>{try{res.json(await registerWithPassword(req.body.email,req.body.password,req.body.displayName,meta(req)))}catch(e){next(e)}})
router.post('/login',loginLimiter,async(req,res,next)=>{try{res.json(await loginWithPassword(req.body.email,req.body.password,meta(req)))}catch(e){next(e)}})
router.post('/dev',async(req,res,next)=>{try{res.json(await loginDev(meta(req)))}catch(e){next(e)}})
router.post('/refresh',async(req,res,next)=>{try{res.json(await refreshSession(req.body.refreshToken))}catch(e){next(e)}})
router.get('/me',requireAuth,async(req,res,next)=>{try{const user=await getUser(req.auth.sub);if(!user)return res.status(404).json({error:{code:'USER_NOT_FOUND',message:'Không tìm thấy tài khoản.'}});res.json({user})}catch(e){next(e)}})
router.put('/onboarding',requireAuth,async(req,res,next)=>{try{const result=validateOnboarding(req.body);if(!result.valid)return res.status(422).json({error:{code:'VALIDATION_ERROR',message:'Thông tin onboarding chưa hợp lệ.',fields:result.errors}});res.json({user:await completeOnboarding(req.auth.sub,req.body)})}catch(e){next(e)}})
export default router
