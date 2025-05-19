"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const qstash_1 = require("@upstash/qstash");
const config_1 = require("../config");
const logger_1 = require("./logger");
const qstashClient = new qstash_1.Client({ token: config_1.config.qstash.token });
const sendEmail = async (params) => {
    try {
        const { to, subject, text, html } = params;
        await qstashClient.publishJSON({
            api: {
                name: 'email',
                provider: (0, qstash_1.resend)({ token: config_1.config.email.resendToken }),
            },
            body: {
                from: 'Raijin <contact@raijinascendancy.com>',
                to: Array.isArray(to) ? to : [to],
                subject,
                text,
                html: html || text,
            },
        });
        logger_1.logger.info(`Email sent to ${to}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to send email:', error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
