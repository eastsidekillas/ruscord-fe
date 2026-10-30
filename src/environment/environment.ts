// ruscord-core is reached on the same origin: `ng serve` proxies /api,
// /gateway and /cdn to it (proxy.conf.json), nginx does the same in production.
export const environment = {
  production: false,
  API_URL: '/api/v1',
  GATEWAY_PATH: '/gateway?v=1',
};
