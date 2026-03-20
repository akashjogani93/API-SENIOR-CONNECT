import Joi from 'joi';
import { getData, insertData } from '../../config/index.js';
import { CustomErrorHandler, JwtService } from "../../service/index.js";
import md5 from 'md5';
import paginationQuery from '../../helper/paginationQuery.js';
import commonFunction from '../../helper/commonFunction.js';

const servicesController = {
    async login(req, res, next) {
        try {
            const loginSchema = Joi.object({
                email: Joi.string().optional(),
                phone: Joi.string().optional(),
                password: Joi.string().optional(),
            }).or('email', 'phone').messages({ 'object.missing': 'Either email or phone is required' });

            const { error, value } = loginSchema.validate(req.body ?? {});
            if (error) return next(error);

            if (!value.email || !value.password) {
                return next(CustomErrorHandler.badRequest("email and password are required"));
            }

            // ---------- Get user ----------
            const query = `SELECT user_id,email,phone,password FROM users WHERE is_deleted=0 AND email='${value.email}'`;
            const users = await getData(query, next);
            if (!users || users.length === 0) {
                return next(CustomErrorHandler.wrongCredentials());
            }
            const user = users[0];

            // ---------- Verify password ----------
            const match = md5(req.body.password) === user.password ? true : false;
            if (!match) return next(CustomErrorHandler.wrongCredentials());

            delete user.password; // remove password from response

            // // ---------- Generate JWT ----------
            const accessToken = JwtService.sign(
                { _id: user.user_id, role: user.role },
                '1d'
            );

            return res.json({
                status: true,
                message: "User logged in successfully",
                accessToken,
                data: user
            });

        } catch (err) {
            next(err);
        }
    },
    async forgotPassword(req, res, next) {
        try {
            const schema = Joi.object({
                email: Joi.string().optional(),
                phone: Joi.string().optional(),
            }).or('email', 'phone')
                .messages({
                    'object.missing': 'Either email or phone is required'
                });

            const { error, value } = schema.validate(req.body ?? {});
            if (error) return next(error);
            let cond = '';
            const userQuery = `SELECT user_id, phone FROM users WHERE  is_deleted = 0 ${cond} AND  email = '${value.email}' OR phone = '${value.phone}'`;

            const users = await getData(userQuery, next);

            if (!users || users.length === 0) {
                return next(CustomErrorHandler.doesNotExist("User not found"));
            }

            const user = users[0];
            // Send OTP only when creating new password
            const otp = await commonFunction.setOtp({ userId: user?.user_id, phoneNumber: user?.phone }, next);

            return res.json({
                success: true,
                otp: otp,
                message: "OTP sent successfully"
            });

        } catch (err) {
            return next(err);
        }
    },
    async verifyOtp(req, res, next) {
        try {

            const schema = Joi.object({
                phone: Joi.string().required().messages({
                    'any.required': 'phone is required',
                    'string.empty': 'phone cannot be empty'
                }),
                otp: Joi.number().required().messages({
                    'any.required': 'otp is required'
                })
            });

            const { error, value } = schema.validate(req.body ?? {});
            if (error) return next(error);

            let cond = '';
            const userQuery = `SELECT user_id, phone FROM users WHERE phone = '${value.phone}' ${cond}`;
            const { otp } = value;
            // ---------- Build condition dynamically ----------
            let whereClause = ``;

            const users = await getData(userQuery, next);

            if (!users || users.length === 0) {
                return next(CustomErrorHandler.doesNotExist("Phone number is wrong"));
            }
            const user = users[0];
            if (user?.phone) {
                whereClause = `phone = "${user?.phone}"`;
            } else {
                whereClause = `user_id = "${user?.user_id}"`;
            }

            const otpQuery = `
                SELECT otp_id, created_at
                FROM otp
                WHERE ${whereClause}
                  AND otp = ${otp}
                ORDER BY otp_id DESC
                LIMIT 1
            `;

            const otpData = await getData(otpQuery, next);

            if (!otpData || otpData.length === 0) {
                return next(
                    CustomErrorHandler.wrongCredentials("Invalid OTP")
                );
            }

            // ---------- Check expiry (10 minutes) ----------
            const createdAt = new Date(otpData[0].created_at);
            const now = new Date();
            const diffMinutes = (now - createdAt) / (1000 * 60);

            if (diffMinutes > 1) {
                return next(
                    CustomErrorHandler.badRequest("OTP expired")
                );
            }

            // ---------- OTP verified ----------
            return res.json({
                success: true,
                message: "OTP verified successfully"
            });

        } catch (err) {
            return next(err);
        }
    },
    async changePassword(req, res, next) {
        try {
            // ---------- Validation ----------
            const schema = Joi.object({
                phone: Joi.number().optional(),
                newPassword: Joi.string().required(),
                confirmPassword: Joi.string().required()
            }).messages({
                    'object.missing': 'phone number is required'
                });

            const { error, value } = schema.validate(req.body ?? {});
            if (error) {
                return next(error);
            }

            // ---------- Password match check ----------
            if (value.newPassword !== value.confirmPassword) {
                return next(
                    CustomErrorHandler.badRequest("Password and confirm password do not match")
                );
            }

            // ---------- Check user ----------
            const query = `SELECT user_id, email, phone,password FROM users WHERE is_deleted = 0 AND phone = '${value.phone}'`;

            const data = await getData(query, next);

            if (!data || data.length === 0) {
                return next(CustomErrorHandler.wrongCredentials());
            }

            // ---------- Update password ----------
            const newPassword1 = md5(value.newPassword);

            const updateQuery = `
                    UPDATE users 
                    SET password = '${newPassword1}'
                    WHERE user_id = ${data[0].user_id}
                `;

            await insertData(updateQuery, {}, next);

            delete data[0].password;

            return res.json({
                success: true,
                message: "Password reset successfully",
                data: data[0]
            });

        } catch (error) {
            return next(error);
        }
    },
}
export default servicesController;