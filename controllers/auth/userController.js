import Joi from 'joi';
import { getData, insertData } from '../../config/index.js';
import { CustomErrorHandler, JwtService } from "../../service/index.js";
import md5 from 'md5';
import paginationQuery from '../../helper/paginationQuery.js';
import commonFunction from '../../helper/commonFunction.js';

const userController = {
    async addUpdateUserProfile(req, res, next) {
        try {
            // ------------------ Validation Schema ------------------
            const baseSchema = Joi.object({
                user_id: Joi.number().integer().optional(),
                role: Joi.string().valid('senior', 'provider').required(),
                name: Joi.string().required(),
                email: Joi.string().email().required(),
                phone: Joi.string().required(),
                password: Joi.string().required(),
                business_type: Joi.string()
                    .valid('hospital', 'caretaker', 'medical_store', 'volunteer')
                    .when('role', {
                        is: 'provider',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    }),
                address: Joi.string().when('role', {
                    is: 'provider',
                    then: Joi.optional(),
                    otherwise: Joi.optional()
                }),
                description: Joi.string().optional(),
                city: Joi.string().required(),
                pincode: Joi.string().required()
            });

            var dataObj = { ...req.body };
            const { error } = baseSchema.validate(dataObj ?? {});
            if (error) {
                return next(error);
            }

            // ------------------ Check Existing ------------------
            let condition = '';
            if (dataObj.user_id) {
                condition = ` AND user_id != '${dataObj.user_id}'`;
            } else {
                dataObj.password = md5(dataObj.password);
            }
            const checkQuery = `SELECT user_id, is_deleted FROM users WHERE (email='${dataObj.email}' OR phone='${dataObj.phone}') ${condition} `;

            const exists = await getData(checkQuery, next);
            if ((exists.length > 0) && exists[0].is_deleted == '0') {
                return next(
                    CustomErrorHandler.alreadyExist(
                        "Email or phone number already exists"
                    )
                );
            }

            let query = "";
            if (dataObj.user_id) {
                query = `UPDATE users SET ? WHERE user_id='${dataObj.user_id}'`;
            } else {
                query = `INSERT INTO users SET ?`;
            }
            const result = await insertData(query, dataObj, next);

            if (result.insertId) {
                dataObj.user_id = result.insertId;
            }
            delete dataObj.password;
            return res.json({
                success: true,
                message: dataObj.user_id
                    ? `${dataObj.role} registered successfully`
                    : `${dataObj.role} updated successfully`,
                data: dataObj
            });
        } catch (error) {
            next(error);
        }
    },

    async addUpdateInvitation(req, res, next) {
        try {
            // ------------------ Validation Schema ------------------
            const baseSchema = Joi.object({
                invitation_id: Joi.number().integer().optional(),
                user_id: Joi.number().required(),
                title: Joi.string().max(150).required(),
                event_type: Joi.string().valid('Social Gatherings', 'Educational', 'Health & Wellness', 'Hobbies', 'religious', 'community', 'Other').required(),
                event_date: Joi.date().required(),
                description: Joi.string().required(),
                city: Joi.string().required(),
                is_deleted: Joi.number().valid(0, 1).optional()
            });

            const dataObj = { ...req.body };

            const { error } = baseSchema.validate(dataObj ?? {});
            if (error) {
                return next(error);
            }

            // ------------------ Check User Exists ------------------
            const userCheckQuery = `SELECT user_id FROM users WHERE user_id='${dataObj.user_id}' AND is_deleted=0`;
            const userExists = await getData(userCheckQuery, next);

            if (!userExists.length) {
                return next(CustomErrorHandler.notFound("User not found"));
            }

            const currentTime = new Date();

            // ------------------ Insert / Update ------------------
            let query = "";

            if (dataObj.invitation_id) {
                dataObj.updated_at = currentTime;
                query = `UPDATE invitations SET ? WHERE invitation_id='${dataObj.invitation_id}'`;
            } else {
                dataObj.created_at = currentTime;
                dataObj.updated_at = currentTime;
                query = `INSERT INTO invitations SET ?`;
            }

            const result = await insertData(query, dataObj, next);

            // if (result.insertId) {
            //     dataObj.invitation_id = result.insertId;
            // }

            return res.json({
                success: true,
                message: dataObj.invitation_id
                    ? "Invitation updated successfully"
                    : "Invitation created successfully",
                data: dataObj
            });

        } catch (error) {
            next(error);
        }
    }
}

export default userController;