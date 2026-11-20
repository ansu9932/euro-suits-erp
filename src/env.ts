import {defineEnvVars} from '@sveltejs/kit/env';

// The Node fallback receives API traffic through NGINX. Pages supplies these at runtime.
const optionalBinding = {schema: (value: string | undefined) => value};
export const variables = defineEnvVars({
 ERP_BACKEND_ORIGIN: optionalBinding,
 ERP_PUBLIC_ORIGIN: optionalBinding,
 ERP_PROXY_SECRET: optionalBinding
});
