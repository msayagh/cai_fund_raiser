'use strict';

const prisma = require('../db/client');
const AppError = require('../utils/AppError');

/**
 * Middleware factory that checks if the authenticated admin/donor has a specific capability.
 * Usage: router.get('/route', requireAdmin, requireCapability('admin.donors.view'), controller)
 *
 * Call this after requireAdmin/requireDonor middleware to ensure req.admin or req.donor is set.
 */
const requireCapability = (capabilityName) => {
    return async (req, res, next) => {
        try {
            // Determine user type from the request object
            const isAdmin = !!req.admin;
            const isDonor = !!req.donor;

            if (!isAdmin && !isDonor) {
                throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
            }

            const userId = isAdmin ? req.admin.id : req.donor.id;
            const userType = isAdmin ? 'admin' : 'donor';

            // Fetch user's roles and capabilities
            let userCapabilities;

            if (isAdmin) {
                // Get admin's roles and their capabilities
                userCapabilities = await prisma.roleCapability.findMany({
                    where: {
                        role: {
                            adminRoles: {
                                some: {
                                    adminId: userId,
                                },
                            },
                        },
                    },
                    include: {
                        capability: true,
                    },
                });
            } else {
                // Get donor's roles and their capabilities
                userCapabilities = await prisma.roleCapability.findMany({
                    where: {
                        role: {
                            donorRoles: {
                                some: {
                                    donorId: userId,
                                },
                            },
                        },
                    },
                    include: {
                        capability: true,
                    },
                });
            }

            // Check if user has the required capability
            const hasCapability = userCapabilities.some(
                (rc) => rc.capability.name === capabilityName
            );

            if (!hasCapability) {
                throw new AppError(
                    `Insufficient permissions. Required capability: ${capabilityName}`,
                    403,
                    'INSUFFICIENT_PERMISSIONS'
                );
            }

            // Store user's capabilities in request for logging/audit purposes
            req.userCapabilities = userCapabilities.map((rc) => rc.capability.name);

            next();
        } catch (err) {
            next(err);
        }
    };
};

/**
 * Middleware to get admin's roles for logging/display purposes.
 * Attaches req.adminRoles after requireAdmin.
 */
const attachAdminRoles = async (req, res, next) => {
    try {
        if (!req.admin) {
            next();
            return;
        }

        const adminRoles = await prisma.adminRole.findMany({
            where: { adminId: req.admin.id },
            include: {
                role: {
                    include: {
                        roleCapabilities: {
                            include: {
                                capability: true,
                            },
                        },
                    },
                },
            },
        });

        req.adminRoles = adminRoles.map((ar) => ({
            name: ar.role.name,
            capabilities: ar.role.roleCapabilities.map((rc) => rc.capability.name),
        }));

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { requireCapability, attachAdminRoles };
