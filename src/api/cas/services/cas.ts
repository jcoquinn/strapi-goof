/**
 * cas service
 */

import { XMLParser } from 'fast-xml-parser';

type username = string;

class TicketValidator {
    private url: string;
    private parser: XMLParser;
    private errPrefix = 'CAS:';

    constructor(casEndpoint: string) {
        this.url = casEndpoint;
        this.parser = new XMLParser();
    }

    async validate(ticket: string, service: string): Promise<username> {
        const xml = await this.validateTicket(ticket, service);
        return this.handleResponse(xml);
    }

    private async validateTicket(ticket: string, service: string): Promise<string> {
        const t = encodeURIComponent(ticket);
        const s = encodeURIComponent(service);
        const url = `${this.url}/serviceValidate?ticket=${t}&service=${s}`;

        const resp = await fetch(url, { headers: { Accept: 'application/xml' } });
        if (!resp.ok) {
            throw this.newError(`failed validating ticket: ${resp.status} ${resp.statusText}`);
        }
        return await resp.text();
    }

    private handleResponse(xml: string): username {
        const data = this.parser.parse(xml);
        const root = data['cas:serviceResponse'];
        const success = root['cas:authenticationSuccess'];
        const failure = root['cas:authenticationFailure'];

        if (success) {
            const username = success['cas:user'] || null;
            if (!username) {
                throw this.newError('authenticationSuccess missing username');
            }
            return username;
        }
        if (failure) {
            throw this.newError(failure['#text'] || 'ticket validation failed');
        }
        throw this.newError('invalid serviceResponse');
    }

    private newError(message: string): Error {
        return new Error(`${this.errPrefix} ${message}`);
    }
}

const tv = new TicketValidator(process.env.CAS_URL);

export default ({ strapi }) => ({
    async validateTicket(ticket: string, service: string): Promise<string> {
        return tv.validate(ticket, service);
    },
});
