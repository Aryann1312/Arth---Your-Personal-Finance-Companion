/**
 * @file role.js
 * @description Role-based access control middleware (e.g. requireRole('admin'))
 */

export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User not authenticated.'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Requires '${requiredRole}' privileges.`
      });
    }

    next();
  };
}
