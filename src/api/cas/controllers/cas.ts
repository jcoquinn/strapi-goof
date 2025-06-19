import type { Context } from 'koa';

import { TicketValidator } from '..';
import { routes } from '../routes/cas';

const serviceUrl = `${process.env.URL}/api${routes.callback.path}`;
const ticketValidator = new TicketValidator(process.env.CAS_URL, serviceUrl);

export default {
    async login(ctx: Context) {
        ctx.redirect(`${process.env.CAS_URL}/login?service=${encodeURIComponent(serviceUrl)}`);
    },
    async callback(ctx: Context) {
        const { ticket } = ctx.query as { ticket?: string };
        if (!ticket) {
            ctx.status = 400;
            ctx.body = { error: 'CAS: missing ticket query param' };
            return;
        }
        try {
            return await ticketValidator.validate(ticket);
        } catch (err: unknown) {
            ctx.status = 502;
            ctx.body = {
                error: 'CAS: failed validating ticket',
                details: err instanceof Error ? err.message : String(err),
            };
        }
    },
};
