import { factories } from '@strapi/strapi';
import type { Context } from 'koa';
import { routes } from '../routes/cas';

const service = `${process.env.URL}/api${routes.callback.path}`;

export default factories.createCoreController('api::cas.cas', ({ strapi }) =>  ({
    async login(ctx: Context) {
        ctx.redirect(`${process.env.CAS_URL}/login?service=${encodeURIComponent(service)}`);
    },
    async callback(ctx: Context) {
        const { ticket } = ctx.query as { ticket?: string };
        if (!ticket) {
            ctx.status = 400;
            ctx.body = { error: 'CAS: missing ticket query param' };
            return;
        }
        try {
            return await strapi.service('api::cas.cas').validateTicket(ticket, service);
        } catch (err: unknown) {
            ctx.status = 502;
            ctx.body = {
                error: 'CAS: failed validating ticket',
                details: err instanceof Error ? err.message : String(err),
            };
        }
    },
};
