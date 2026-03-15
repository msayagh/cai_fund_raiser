'use strict';

const AppError = require('../utils/AppError');

/**
 * Middleware factory that checks if the authenticated admin/donor has a specific capability.
 * Usage: router.get('/route', requireAdmin, requireCapability('admin.donors.view'), controller)
 *
 * The role/capability system has been simplified: any authenticated admin or donor
 * is granted all capabilities. The capabilityName argument is kept for future use.
 */
const requireCapability = (_capabilityName) => {
    return (req, res, next) => {
        if (!req.admin && !req.donor) {
            return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
        }
        next();
    };
};

/**
 * Middleware to get admin's roles for logging/display purposes.
 * Attaches req.adminRoles after requireAdmin.
 * Role system simplified — attaches an empty array.
 */
const attachAdminRoles = (req, res, next) => {
    req.adminRoles = [];
    next();
};

module.exports = { requireCapability, attachAdminRoles };
