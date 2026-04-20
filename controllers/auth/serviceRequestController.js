import Joi from 'joi';
import { getData, insertData } from '../../config/index.js';
import { CustomErrorHandler } from "../../service/index.js";

const serviceRequestController = {

    // ✅ 1. ADD / UPDATE REQUEST (Senior)
    async addUpdateServiceRequest(req, res, next) {
        try {
            const schema = Joi.object({
                service_id: Joi.number().optional(),
                user_id: Joi.number().required(),
                provider_id: Joi.number().required(),

                service_type: Joi.string()
                    .valid('caretaker','medical_store')
                    .required(),

                request_title: Joi.string().max(150).required(),
                service_description: Joi.string().required(),

                preferred_date: Joi.date().optional().allow(null),

                status: Joi.string()
                    .valid('pending','accepted','rejected','completed','cancelled')
                    .optional()
            });

            const dataObj = { ...req.body };

            const { error } = schema.validate(dataObj ?? {});
            if (error) return next(error);

            const currentTime = new Date();

            let query = "";

            if (dataObj.service_id) {
                dataObj.updated_at = currentTime;
                query = `UPDATE service_requests SET ? WHERE service_id='${dataObj.service_id}'`;
            } else {
                dataObj.created_at = currentTime;
                dataObj.updated_at = currentTime;
                dataObj.status = 'pending';
                query = `INSERT INTO service_requests SET ?`;
            }

            await insertData(query, dataObj, next);

            return res.json({
                success: true,
                message: dataObj.service_id
                    ? "Service request updated successfully"
                    : "Service request sent successfully",
                data: dataObj
            });

        } catch (err) {
            next(err);
        }
    },

    // ✅ 2. LIST REQUESTS (Senior + Provider)
    async serviceRequestList(req, res, next) {
        try {

            let query = `
                SELECT 
                    s.*,
                    u.name AS user_name,
                    p.name AS provider_name
                FROM service_requests s
                LEFT JOIN users u ON u.user_id = s.user_id
                LEFT JOIN users p ON p.user_id = s.provider_id
                WHERE 1=1
            `;

            let cond = '';

            const schema = Joi.object({
                service_id: Joi.number().optional(),
                user_id: Joi.number().optional(),
                provider_id: Joi.number().optional(),
                service_type: Joi.string().optional(),
                status: Joi.string().optional(),
                preferred_date: Joi.date().optional()
            });

            const { error } = schema.validate(req.query);
            if (error) return next(error);

            if (req.query.service_id) {
                cond += ` AND s.service_id = ${req.query.service_id}`;
            }

            if (req.query.user_id) {
                cond += ` AND s.user_id = ${req.query.user_id}`;
            }

            if (req.query.provider_id) {
                cond += ` AND s.provider_id = ${req.query.provider_id}`;
            }

            if (req.query.service_type) {
                cond += ` AND s.service_type = '${req.query.service_type}'`;
            }

            if (req.query.status) {
                cond += ` AND s.status = '${req.query.status}'`;
            }

            if (req.query.preferred_date) {
                cond += ` AND DATE(s.preferred_date) = '${req.query.preferred_date}'`;
            }

            cond += ` ORDER BY s.service_id DESC`;

            query += cond;

            const data = await getData(query, next);

            return res.json({
                success: true,
                message: "Service requests fetched successfully",
                data
            });

        } catch (err) {
            next(err);
        }
    },

    // ✅ 3. UPDATE STATUS (Provider)
    async updateServiceStatus(req, res, next) {
        try {

            const schema = Joi.object({
                service_id: Joi.number().required(),
                status: Joi.string()
                    .valid('accepted','rejected','completed','cancelled')
                    .required()
            });

            const dataObj = { ...req.body };

            const { error } = schema.validate(dataObj ?? {});
            if (error) return next(error);

            const query = `
                UPDATE service_requests 
                SET status='${dataObj.status}'
                WHERE service_id='${dataObj.service_id}'
            `;

            await getData(query, next);

            return res.json({
                success: true,
                message: "Service request status updated successfully"
            });

        } catch (err) {
            next(err);
        }
    }

};

export default serviceRequestController;