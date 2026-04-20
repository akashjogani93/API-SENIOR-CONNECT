import Joi from 'joi';
import { getData, insertData } from '../../config/index.js';
import { CustomErrorHandler, JwtService } from "../../service/index.js";
import md5 from 'md5';
import paginationQuery from '../../helper/paginationQuery.js';
import commonFunction from '../../helper/commonFunction.js';

const appointmentController = {
    async addUpdateAppointment(req, res, next) {
        try {
            const schema = Joi.object({
                appointment_id: Joi.number().optional(),
                provider_id: Joi.number().required(),
                appointment_date: Joi.date().required(),
                appointment_time: Joi.string().required(),
                status: Joi.string()
                    .valid('Available', 'Pending', 'Confirmed', 'Completed', 'Cancelled')
                    .optional(),
                user_id: Joi.number().optional().allow(null),
                description: Joi.string().optional()
            });

            const dataObj = { ...req.body };

            const { error } = schema.validate(dataObj ?? {});
            if (error) return next(error);

            const currentTime = new Date();

            let query = "";

            if (dataObj.appointment_id) {
                dataObj.updated_at = currentTime;
                query = `UPDATE appointmentsnew SET ? WHERE appointment_id='${dataObj.appointment_id}'`;
            } else {
                dataObj.created_at = currentTime;
                dataObj.updated_at = currentTime;
                dataObj.status = 'Available';
                query = `INSERT INTO appointmentsnew SET ?`;
            }

            await insertData(query, dataObj, next);

            return res.json({
                success: true,
                message: dataObj.appointment_id
                    ? "Appointment updated successfully"
                    : "Appointment created successfully",
                data: dataObj
            });

        } catch (err) {
            next(err);
        }
    },
    async appointmentList(req, res, next) {
        try {
            let query = `
            SELECT 
                a.*,
                u.name AS user_name,
                p.name AS provider_name
            FROM appointmentsnew a
            LEFT JOIN users u ON u.user_id = a.user_id
            LEFT JOIN users p ON p.user_id = a.provider_id
            WHERE 1=1
        `;

            let cond = '';

            const schema = Joi.object({
                appointment_id: Joi.number().optional(),
                provider_id: Joi.number().optional(),
                user_id: Joi.number().optional(),
                appointment_date: Joi.date().optional(),
                status: Joi.string().optional(),
                latest: Joi.alternatives().try(
                    Joi.boolean(),
                    Joi.string().valid("true", "false")
                ).optional()
            });

            const { error } = schema.validate(req.query);
            if (error) return next(error);

            if (req.query.provider_id) {
                cond += ` AND a.provider_id = ${req.query.provider_id}`;
            }

            if (req.query.user_id) {
                cond += ` AND a.user_id = ${req.query.user_id}`;
            }

            if (req.query.appointment_id) {
                cond += ` AND a.appointment_id = ${req.query.appointment_id}`;
            }

            if (req.query.appointment_date) {
                cond += ` AND DATE(a.appointment_date) = '${req.query.appointment_date}'`;
            }

            if (req.query.status) {
                cond += ` AND a.status = '${req.query.status}'`;
            }

            if (req.query.latest == "true") {

                const now = new Date();

                const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
                const currentTime = now.toTimeString().slice(0, 8);  // HH:MM:SS

                cond += `
                    AND (
                        a.appointment_date > '${currentDate}'
                        OR (
                            a.appointment_date = '${currentDate}'
                            AND a.appointment_time >= '${currentTime}'
                        )
                    )
                `;
            }

            cond += ` ORDER BY a.appointment_id DESC`;

            query += cond;

            const data = await getData(query, next);

            return res.json({
                success: true,
                message: "appointmentsnew fetched successfully",
                data
            });

        } catch (err) {
            next(err);
        }
    },
    async bookAppointment(req, res, next) {
        try {
            const schema = Joi.object({
                appointment_id: Joi.number().required(),
                user_id: Joi.number().required()
            });

            const dataObj = { ...req.body };

            const { error } = schema.validate(dataObj ?? {});
            if (error) return next(error);

            // check slot is available
            const checkQuery = `
            SELECT * FROM appointmentsnew 
            WHERE appointment_id='${dataObj.appointment_id}'
            AND status='Available'
        `;

            const exists = await getData(checkQuery, next);

            if (!exists.length) {
                return next(CustomErrorHandler.notFound("Slot not available"));
            }

            // book slot
            const updateQuery = `
            UPDATE appointmentsnew 
            SET user_id='${dataObj.user_id}', status='Pending'
            WHERE appointment_id='${dataObj.appointment_id}'
        `;

            await getData(updateQuery, next);

            return res.json({
                success: true,
                message: "Appointment booked successfully"
            });

        } catch (err) {
            next(err);
        }
    },
    async updateAppointmentStatus(req, res, next) {
        try {
            const schema = Joi.object({
                appointment_id: Joi.number().required(),
                status: Joi.string()
                    .valid('Confirmed', 'Cancelled', 'Completed')
                    .required()
            });

            const dataObj = { ...req.body };

            const { error } = schema.validate(dataObj ?? {});
            if (error) return next(error);

            let query = `
            UPDATE appointmentsnew 
            SET status='${dataObj.status}'
        `;

            // if cancelled → make slot free again
            if (dataObj.status === 'Cancelled') {
                query = `
                UPDATE appointmentsnew 
                SET status='Available', user_id=NULL
            `;
            }

            query += ` WHERE appointment_id='${dataObj.appointment_id}'`;

            await getData(query, next);

            return res.json({
                success: true,
                message: "Status updated successfully"
            });

        } catch (err) {
            next(err);
        }
    }
}

export default appointmentController;