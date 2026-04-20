import express from 'express';
import multer from 'multer';
import imageUpload from '../helper/imageUpload.js';
import auth from '../middlewares/auth.js';
import { userController,servicesController,appointmentController,serviceRequestController,chaatController } from '../controllers/index.js';



const forms = multer().array();
const forms1 = multer().any();


const router = express.Router();

router.post('/register', forms, userController.addUpdateUserProfile);
router.post('/login', forms, servicesController.login);
router.post('/forgotPassword', forms, servicesController.forgotPassword);
router.post('/otpVerification', forms, servicesController.verifyOtp);
router.post('/changePassword', forms, servicesController.changePassword);

router.get('/service', forms, userController.userList);

router.post('/invitation',auth, forms, userController.addUpdateInvitation);
router.get('/invitation', forms, userController.InvitationList);

router.post('/appointment',auth, forms, appointmentController.addUpdateAppointment);
router.get('/appointment', forms, appointmentController.appointmentList);
router.post('/bookAppointment',auth, forms, appointmentController.bookAppointment);
router.post('/appointmentUpdateStatus',auth, forms, appointmentController.updateAppointmentStatus);

router.post('/serviceRequest',auth, forms, serviceRequestController.addUpdateServiceRequest);
router.get('/serviceList',auth, forms, serviceRequestController.serviceRequestList);
router.post('/serviceUpdateStatus',auth, forms, serviceRequestController.updateServiceStatus);

router.get('/Chatlist',auth, forms, chaatController.getConversationList);
router.get('/chatMessages',auth, forms, chaatController.getMessages);
router.post('/chatSend',auth, forms, chaatController.sendMessage);  

export default router;