import express from 'express';
import multer from 'multer';
import imageUpload from '../helper/imageUpload.js';
import auth from '../middlewares/auth.js';
import { userController,servicesController } from '../controllers/index.js';



const forms = multer().array();
const forms1 = multer().any();


const router = express.Router();

router.post('/register', forms, userController.addUpdateUserProfile);
router.post('/login', forms, servicesController.login);
router.post('/forgotPassword', forms, servicesController.forgotPassword);
router.post('/otpVerification', forms, servicesController.verifyOtp);
router.post('/changePassword', forms, servicesController.changePassword);

router.post('/invitation',auth, forms, userController.addUpdateInvitation);
router.get('/invitation', forms, userController.InvitationList);

export default router;