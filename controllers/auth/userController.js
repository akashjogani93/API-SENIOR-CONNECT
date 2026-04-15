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
                password: Joi.string().optional(),
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
                Invitation_id: Joi.number().integer().optional(),
                user_id: Joi.number().required(),
                title: Joi.string().max(150).required(),
                event_type: Joi.string().valid('Social Gatherings', 'Educational', 'Health & Wellness', 'Hobbies', 'religious', 'community', 'Other').required(),
                event_date: Joi.date().required(),
                description: Joi.string().required(),
                city: Joi.string().required(),
                address: Joi.string().allow('', null).optional(),
                status: Joi.string()
                    .valid('Upcoming', 'Ongoing', 'Completed', 'Cancelled')
                    .optional(),

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

            if (dataObj.Invitation_id) {
                dataObj.updated_at = currentTime;
                query = `UPDATE invitations SET ? WHERE Invitation_id='${dataObj.Invitation_id}'`;
            } else {
                dataObj.created_at = currentTime;
                dataObj.updated_at = currentTime;
                query = `INSERT INTO invitations SET ?`;
            }

            const result = await insertData(query, dataObj, next);

            // if (result.insertId) {
            //     dataObj.Invitation_id = result.insertId;
            // }

            return res.json({
                success: true,
                message: dataObj.Invitation_id
                    ? "Invitation updated successfully"
                    : "Invitation created successfully",
                data: dataObj
            });

        } catch (error) {
            next(error);
        }
    },
    async InvitationList(req, res, next) {
        try {
            /* ------------------ Base Query ------------------ */
            let query = `
                SELECT 
                    invitations.*, 
                    users.name AS user_name
                FROM invitations
                LEFT JOIN users ON users.user_id = invitations.user_id
                WHERE invitations.is_deleted = 0
            `;
            let cond = '';
            let page = { pageQuery: '' };

            /* ------------------ Validation Schema ------------------ */
            const schema = Joi.object({
                Invitation_id: Joi.number().integer().optional(),
                user_id: Joi.number().integer().optional(),
                title: Joi.string().optional(),
                event_type: Joi.string().optional(),
                city: Joi.string().optional(),
                event_date: Joi.date().optional(),
                pagination: Joi.boolean().optional(),
                current_page: Joi.number().integer().optional(),
                per_page_records: Joi.number().integer().optional(),
            });

            const { error } = schema.validate(req.query);
            if (error) return next(error);

            /* ------------------ Filters ------------------ */

            if (req.query.user_id) {
                cond += ` AND invitations.user_id = ${req.query.user_id}`;
            } else {
                cond += ` AND status != 'Completed'`;
            }

            if (req.query.Invitation_id) {
                cond += ` AND Invitation_id = ${req.query.Invitation_id}`;
            }

            if (req.query.title) {
                cond += ` AND title LIKE '%${req.query.title}%'`;
            }

            if (req.query.event_type) {
                cond += ` AND event_type = '${req.query.event_type}'`;
            }

            if (req.query.city) {
                cond += ` AND invitations.city LIKE '%${req.query.city}%'`;
            }

            if (req.query.event_date) {
                cond += ` AND DATE(event_date) = '${req.query.event_date}'`;
            }

            /* ------------------ Pagination ------------------ */
            if (req.query.pagination) {
                page = await paginationQuery(
                    query + cond,
                    next,
                    req.query.current_page,
                    req.query.per_page_records
                );
            }

            query += cond + page.pageQuery;

            const data = await getData(query, next);

            return res.json({
                success: true,
                message: "Invitation list fetched successfully",
                total_records: page.total_rec ?? data.length,
                number_of_pages: page.number_of_pages || 1,
                currentPage: page.currentPage || 1,
                records: data.length,
                data: data
            });

        } catch (error) {
            next(error);
        }
    }
}

export default userController;