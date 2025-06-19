import { XMLParser } from 'fast-xml-parser';

type username = string;

export class TicketValidator {
    private casUrl: string;
    private serviceUrl: string;
    private parser: XMLParser;
    private errPrefix = 'CAS:';

    constructor(casUrl: string, serviceUrl: string) {
        if (!casUrl.trim()) {
            throw new Error(`${this.errPrefix} server URL is required`);
        }
        if (!serviceUrl.trim()) {
            throw new Error(`${this.errPrefix} service URL is required`);
        }
        this.casUrl = casUrl;
        this.serviceUrl = serviceUrl;
        this.parser = new XMLParser();
    }

    async validate(ticket: string): Promise<username> {
        const xml = await this.validateTicket(ticket);
        return this.handleResponse(xml);
    }

    private async validateTicket(ticket: string): Promise<string> {
        const t = encodeURIComponent(ticket);
        const s = encodeURIComponent(this.serviceUrl);
        const url = `${this.casUrl}/serviceValidate?ticket=${t}&service=${s}`;

        const resp = await fetch(url, { headers: { Accept: 'application/xml' } });
        if (!resp.ok) {
            throw new Error(
                `${this.errPrefix} failed validating ticket: ${resp.status} ${resp.statusText}`,
            );
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
                throw new Error(`${this.errPrefix} authenticationSuccess missing username`);
            }
            return username;
        }

        if (failure) {
            const mesg = failure['#text'] || 'ticket validation failed';
            throw new Error(`${this.errPrefix} ${mesg}`);
        }

        throw new Error(`${this.errPrefix} invalid serviceResponse`);
    }
}
