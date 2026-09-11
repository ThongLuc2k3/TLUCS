import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { globalSearch } from '../services/searchService.js'
const router=Router();router.get('/',optionalAuth,async(req,res,next)=>{try{res.json({data:await globalSearch(req.query.q,req.auth?.sub,req.query.universityId||req.query.university)})}catch(error){next(error)}});export default router
