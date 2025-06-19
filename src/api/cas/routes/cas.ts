export const routes = {
    login: {
        method: 'GET',
        path: '/cas/login',
        handler: 'cas.login',
        config: {
            auth: false,
        },
    },
    callback: {
        method: 'GET',
        path: '/cas/callback',
        handler: 'cas.callback',
        config: {
            auth: false,
        },
    },
};

export default {
    routes: [routes.login, routes.callback],
};
