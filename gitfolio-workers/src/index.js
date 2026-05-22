import { paymentVerifyHandler, createOrderHandler, licenseByOrderHandler } from './handlers/payment.js';
import { licenseValidateHandler, getValidLicense } from './handlers/license.js';
import { badgeHandler } from './handlers/badge.js';
import { leaderboardSubmitHandler, leaderboardGetHandler } from './handlers/leaderboard.js';
import { startDeviceFlowHandler, pollTokenHandler } from './handlers/auth.js';
import { aiHandler } from './handlers/ai.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    const origin = request.headers.get('Origin') || "https://gitfolio.harmnix.com";
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-license-key',
    };

    const createCORSResponse = (body, status, headers = {}) => {
      const responseHeaders = {
        ...corsHeaders,
        ...headers,
      };

      let responseBody = body;
      if (body && typeof body === 'object') {
        responseBody = JSON.stringify(body);
        responseHeaders['Content-Type'] = 'application/json';
      }

      return new Response(responseBody, {
        status,
        headers: responseHeaders,
      });
    };

    if (method === 'OPTIONS') {
      return createCORSResponse(null, 204);
    }

    try {
      if (path === '/health') {
        return createCORSResponse({ status: 'ok' }, 200);
      }

      let response;

      if (method === 'POST' && path === '/auth/device') {
        response = await startDeviceFlowHandler(request, env, ctx);
      } else if (method === 'POST' && path === '/auth/poll') {
        response = await pollTokenHandler(request, env, ctx);
      } else if (method === 'POST' && path === '/payment/verify') {
        response = await paymentVerifyHandler(request, env, ctx);
      } else if (method === 'POST' && path === '/payment/create-order') {
        response = await createOrderHandler(request, env, ctx);
      } else if (method === 'GET' && path === '/license/by-order') {
        response = await licenseByOrderHandler(request, env, ctx);
       } else if (method === 'GET' && path === '/license/validate') {
         response = await licenseValidateHandler(request, env, ctx);
       } else if (method === 'GET' && path === '/premium/status') {
         const licenseKey = request.headers.get('x-license-key');
         const license = await getValidLicense(licenseKey, env);
         response = new Response(JSON.stringify({ 
           isPremium: !!license, 
           plan: license ? license.plan : null 
         }), {
           status: 200,
           headers: { 'Content-Type': 'application/json' },
         });
       } else if (method === 'POST' && path === '/ai') {

        response = await aiHandler(request, env);
      } else if (method === 'POST' && path === '/leaderboard/submit') {
        response = await leaderboardSubmitHandler(request, env, ctx);
      } else if (method === 'GET' && path.startsWith('/leaderboard/')) {
        const parts = path.split('/');
        if (parts.length === 3) {
          response = await leaderboardGetHandler(request, env, ctx, {
            college: parts[2],
          });
        }
      } else if (method === 'GET' && path.startsWith('/badge/')) {
        const parts = path.split('/');
        if (parts.length === 4) {
          response = await badgeHandler(request, env, ctx, {
            username: parts[2],
            skill: parts[3],
          });
        }
      }

      if (!response) {
        return createCORSResponse({ error: 'Not Found' }, 404);
      }

      const newResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        newResponse.headers.set(k, v);
      });

      return newResponse;
    } catch (error) {
      return createCORSResponse({ error: 'Internal Server Error' }, 500);
    }
  },
};
