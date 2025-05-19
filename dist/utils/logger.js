"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const config_1 = require("../config");
const formatMessage = (level, message, ...meta) => {
    const timestamp = new Date().toISOString();
    const metaString = meta.length ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
};
exports.logger = {
    info(message, ...meta) {
        console.log(formatMessage('info', message, ...meta));
    },
    error(message, ...meta) {
        console.error(formatMessage('error', message, ...meta));
    },
    warn(message, ...meta) {
        console.warn(formatMessage('warn', message, ...meta));
    },
    debug(message, ...meta) {
        if (config_1.config.server.nodeEnv === 'development') {
            console.debug(formatMessage('debug', message, ...meta));
        }
    },
};
