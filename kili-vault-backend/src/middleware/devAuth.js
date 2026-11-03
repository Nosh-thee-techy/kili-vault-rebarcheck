/**
 * Development auth bypass — reads X-User-Role and X-User-ID headers.
 * Replace with Supabase JWT validation in production.
 */
'use strict';

const VALID_ROLES = ['planner', 'developer', 'community', 'agency'];

function devAuthMiddleware(req, res, next) {
  const role = (req.headers['x-user-role'] || 'planner').toLowerCase();
  const userId = req.headers['x-user-id'] || 'demo_user';
  const userName = req.headers['x-user-name'] || role.charAt(0).toUpperCase() + role.slice(1);

  req.user = {
    id: userId,
    role: VALID_ROLES.includes(role) ? role : 'planner',
    name: userName,
  };
  next();
}

module.exports = { devAuthMiddleware, VALID_ROLES };
