import * as http from "http";
import * as https from "https";
import { URL } from "url";

export interface IOjApiClientOptions {
    baseUrl: string;
    token?: string;
    requester?: Requester;
}

export interface IOjProblem {
    problemId: number;
    title: string;
    difficulty: number;
    tags?: string[];
    statement?: string;
}

export interface ICreateSubmissionRequest {
    problemId: number;
    homeworkId?: string;
    sourceCode: string;
}

export interface IOjSubmission {
    submissionId: string;
    status: string;
    score?: number;
}

export interface IOjUser {
    userId: number;
    username: string;
    displayName: string;
    role: string;
}

export interface IOjLoginRequest {
    username: string;
    password: string;
}

export interface IOjLoginResponse {
    accessToken: string;
    user: IOjUser;
}

export interface IOjProfileResponse {
    user: IOjUser;
}

interface IRequestOptions {
    method?: string;
    headers?: { [key: string]: string };
    body?: string;
}

interface IResponseLike {
    ok: boolean;
    status: number;
    json(): Promise<any>;
}

type Requester = (url: string, init: IRequestOptions) => Promise<IResponseLike>;

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

function defaultRequester(url: string, init: IRequestOptions): Promise<IResponseLike> {
    return new Promise<IResponseLike>((resolve: (response: IResponseLike) => void, reject: (error: Error) => void) => {
        const target: URL = new URL(url);
        const transport: typeof http | typeof https = target.protocol === "https:" ? https : http;
        const request: http.ClientRequest = transport.request(
            target,
            {
                method: init.method || "GET",
                headers: init.headers,
            },
            (response: http.IncomingMessage) => {
                const chunks: Buffer[] = [];
                response.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
                response.on("end", () => {
                    const payload: string = Buffer.concat(chunks).toString("utf8");
                    resolve({
                        ok: !!response.statusCode && response.statusCode >= 200 && response.statusCode < 300,
                        status: response.statusCode || 0,
                        json: async (): Promise<any> => payload ? JSON.parse(payload) : {},
                    });
                });
            },
        );
        request.on("error", reject);
        if (init.body) {
            request.write(init.body);
        }
        request.end();
    });
}

export class OjApiClient {
    private readonly baseUrl: string;
    private readonly token: string | undefined;
    private readonly requester: Requester;

    constructor(options: IOjApiClientOptions) {
        this.baseUrl = trimTrailingSlash(options.baseUrl);
        this.token = options.token;
        this.requester = options.requester || defaultRequester;
    }

    public async login(input: IOjLoginRequest): Promise<IOjLoginResponse> {
        return this.request<IOjLoginResponse>("/v1/auth/login", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }

    public async getCurrentUser(): Promise<IOjProfileResponse> {
        return this.request<IOjProfileResponse>("/v1/auth/me");
    }

    public async listProblems(): Promise<IOjProblem[]> {
        return this.request<IOjProblem[]>("/v1/problems");
    }

    public async getProblem(problemId: number | string): Promise<IOjProblem> {
        return this.request<IOjProblem>(`/v1/problems/${problemId}`);
    }

    public async createSubmission(input: ICreateSubmissionRequest): Promise<IOjSubmission> {
        return this.request<IOjSubmission>("/v1/submissions", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }

    public async getSubmission(submissionId: string): Promise<IOjSubmission> {
        return this.request<IOjSubmission>(`/v1/submissions/${submissionId}`);
    }

    private async request<T>(path: string, init: IRequestOptions = {}): Promise<T> {
        const headers: { [key: string]: string } = Object.assign({}, init.headers || {}, {
            "Content-Type": "application/json",
        });
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const response = await this.requester(`${this.baseUrl}${path}`, Object.assign({}, init, { headers }));
        if (!response.ok) {
            throw new Error(`OJ API request failed with status ${response.status}`);
        }
        return response.json();
    }
}
