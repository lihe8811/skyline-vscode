import { IOjLoginResponse, IOjUser } from "../api/ojApiClient";

const tokenKey: string = "skylineOj.accessToken";
const userKey: string = "skylineOj.user";

export interface IOjSecretStorage {
    get(key: string): Thenable<string | undefined>;
    store(key: string, value: string): Thenable<void>;
    delete(key: string): Thenable<void>;
}

export class OjSession {
    private token: string | undefined;
    private user: IOjUser | undefined;

    constructor(private readonly storage: IOjSecretStorage) {}

    public async restore(): Promise<void> {
        this.token = await this.storage.get(tokenKey);
        const serializedUser: string | undefined = await this.storage.get(userKey);
        this.user = serializedUser ? JSON.parse(serializedUser) : undefined;
    }

    public async save(login: IOjLoginResponse): Promise<void> {
        this.token = login.accessToken;
        this.user = login.user;
        await this.storage.store(tokenKey, login.accessToken);
        await this.storage.store(userKey, JSON.stringify(login.user));
    }

    public async clear(): Promise<void> {
        this.token = undefined;
        this.user = undefined;
        await this.storage.delete(tokenKey);
        await this.storage.delete(userKey);
    }

    public getToken(): string | undefined {
        return this.token;
    }

    public getUser(): IOjUser | undefined {
        return this.user;
    }
}
