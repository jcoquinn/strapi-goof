export const routes = {
  login: {
    method: 'GET',
    path: '/cas/login',
    handler: 'controller.login',
    config: {
      auth: false,
    },
  },
  callback: {
    method: 'GET',
    path: '/cas/callback',
    handler: 'controller.callback',
    config: {
      auth: false,
    },
  },
};

export default [routes.login, routes.callback];
