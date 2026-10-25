import serverless from 'serverless-http';

import { createConfiguredApp } from './container';

// Built once per Lambda container. Nothing here opens a database connection;
// that happens lazily on the first request and is reused while the container is warm.
export const handler = serverless(createConfiguredApp());
