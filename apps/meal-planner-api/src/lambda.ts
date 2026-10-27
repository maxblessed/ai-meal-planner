import serverless from 'serverless-http';

import { createConfiguredApp } from './container';

// Built once per Lambda container. Nothing here opens a database connection;
// that happens lazily on the first request and is reused while the container is warm.
export const handler = serverless(createConfiguredApp(), {
  request(req: { clientIp?: string }, event: { requestContext?: { http?: { sourceIp?: string }; identity?: { sourceIp?: string } } }) {
    // HTTP API (v2) and REST API (v1) payloads both carry the gateway-verified caller IP.
    req.clientIp = event.requestContext?.http?.sourceIp ?? event.requestContext?.identity?.sourceIp;
  },
});
