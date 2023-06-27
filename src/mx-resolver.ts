import dns from 'dns';

export default class MxResolver {
    async resolve(hostname: string): Promise<string> {
        const mx = await this.resolveMxAsync(hostname);
        return await this.lookup(mx);
    }

    private async resolveMxAsync(hostname: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                dns.resolveMx(hostname, (resolveErr, addresses: dns.MxRecord[]) => {
                    return resolveErr ? reject(resolveErr) : resolve(addresses[0].exchange);
                });
            } catch (err) {
                return reject(err);
            }
        });
    }

    private async lookup(hostname: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                dns.lookup(hostname, (resolveErr, address: string) => {
                    return resolveErr ? reject(resolveErr) : resolve(address);
                });
            } catch (err) {
                return reject(err);
            }
        });
    }
}