export default ({ env }) => ({
    cas: {
        enabled: true,
        resolve: './src/plugins/cas',
    },
    'users-permissions': {
        config: {
            jwt: {
                expiresIn: '8h',
            },
        },
    },
});
