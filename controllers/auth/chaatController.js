import Joi from 'joi';
import { getData, insertData } from '../../config/index.js';
import { CustomErrorHandler } from "../../service/index.js";

const chaatController = {

    // ✅ 1. SEND MESSAGE
    async sendMessage(req, res, next) {
        try {
            const schema = Joi.object({
                sender_id: Joi.number().required(),
                receiver_id: Joi.number().required(),
                message: Joi.string().required()
            });

            const dataObj = { ...req.body };

            const { error } = schema.validate(dataObj ?? {});
            if (error) return next(error);

            dataObj.created_at = new Date();

            const query = `INSERT INTO messages SET ?`;

            await insertData(query, dataObj, next);

            return res.json({
                success: true,
                message: "Message sent successfully"
            });

        } catch (err) {
            next(err);
        }
    },

    // ✅ 2. FETCH MESSAGES BETWEEN 2 USERS
    async getMessages(req, res, next) {
        try {

            const schema = Joi.object({
                sender_id: Joi.number().required(),
                receiver_id: Joi.number().required()
            });

            const { error } = schema.validate(req.query);
            if (error) return next(error);

            const { sender_id, receiver_id } = req.query;

            const query = `
                SELECT * FROM messages
                WHERE 
                    (sender_id = ${sender_id} AND receiver_id = ${receiver_id})
                    OR
                    (sender_id = ${receiver_id} AND receiver_id = ${sender_id})
                ORDER BY created_at ASC
            `;

            const data = await getData(query, next);

            return res.json({
                success: true,
                message: "Messages fetched successfully",
                data
            });

        } catch (err) {
            next(err);
        }
    },

    // ✅ 3. FETCH CONVERSATION LIST (LEFT PANEL)
    async getConversationList(req, res, next) {
        try {

            const schema = Joi.object({
                user_id: Joi.number().required()
            });

            const { error } = schema.validate(req.query);
            if (error) return next(error);

            const { user_id } = req.query;

            const query = `
                SELECT 
                    u.user_id,
                    u.name
                FROM users u
                WHERE u.user_id IN (
                    SELECT 
                        CASE 
                            WHEN sender_id = ${user_id} THEN receiver_id
                            ELSE sender_id
                        END AS chat_user
                    FROM messages
                    WHERE sender_id = ${user_id} OR receiver_id = ${user_id}
                )
            `;

            const data = await getData(query, next);

            return res.json({
                success: true,
                message: "Conversations fetched successfully",
                data
            });

        } catch (err) {
            next(err);
        }
    }

};

export default chaatController;