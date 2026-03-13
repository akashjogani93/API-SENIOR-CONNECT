import express from 'express';
import multer from 'multer';
import imageUpload from '../helper/imageUpload.js';
import auth from '../middlewares/auth.js';



const forms = multer().array();
const forms1 = multer().any();


const router = express.Router();

export default router;