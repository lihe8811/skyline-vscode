import * as http from "http";
import * as https from "https";
import { URL } from "url";

const apiPrefix: string = "/api/skyline/v1";

export interface IOjApiClientOptions {
    baseUrl: string;
    token?: string;
    requester?: Requester;
}

export interface IOjProblem {
    id: string;
    numericId: number;
    title: string;
    statement: string;
    difficulty?: number;
    tags?: string[];
    timeLimitMs?: number;
    memoryLimitMb?: number;
    language: "py3";
}

export interface IOjHomework {
    id: string;
    title: string;
    description?: string;
    beginAt?: string;
    endAt?: string;
    problemIds?: Array<string | number>;
    groups?: string[];
    problems?: IOjProblem[];
    progress?: {
        score: number;
        solved: number;
        total: number;
    };
}

export interface IOjLeaderboardEntry {
    userId: number;
    displayName: string;
    score: number;
    solved: number;
}

export interface ICreateSubmissionRequest {
    problemId: number | string;
    homeworkId?: string;
    sourceCode: string;
    language?: "py3";
}

export interface IOjSubmission {
    id: string;
    problemId: number;
    status: string;
    score?: number;
    timeMs?: number;
    memoryKb?: number;
}

export interface IOjUser {
    id: number;
    username: string;
    displayName: string;
    role: string;
    groups?: string[];
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

interface IPollOptions {
    intervalMs?: number;
    maxAttempts?: number;
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

function isTerminalSubmission(status: string): boolean {
    return !["waiting", "judging", "compiling", "fetched"].includes(status);
}

function delay(milliseconds: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => setTimeout(resolve, milliseconds));
}

export class OjApiClient {
    private readonly baseUrl: string;
    private readonly token: string | undefined;
    private readonly requester: Requester;

    constructor(options: IOjApiClientOptions) {
        this.baseUrl = `${trimTrailingSlash(options.baseUrl)}${apiPrefix}`;
        this.token = options.token;
        this.requester = options.requester || defaultRequester;
    }

    public async login(input: IOjLoginRequest): Promise<IOjLoginResponse> {
        return this.request<IOjLoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }

    public async logout(): Promise<void> {
        await this.request<{}>("/auth/logout", { method: "POST" });
    }

    public async getCurrentUser(): Promise<IOjProfileResponse> {
        return this.request<IOjProfileResponse>("/auth/me");
    }

    public async listProblems(): Promise<IOjProblem[]> {
        const response = await this.request<{ problems: IOjProblem[] }>("/problems");
        return response.problems;
    }

    public async getProblem(problemId: number | string): Promise<IOjProblem> {
        const response = await this.request<{ problem: IOjProblem }>(`/problems/${encodeURIComponent(String(problemId))}`);
        return response.problem;
    }

    public async listHomeworks(): Promise<IOjHomework[]> {
        const response = await this.request<{ homeworks: IOjHomework[] }>("/homeworks");
        return response.homeworks;
    }

    public async getHomework(homeworkId: string): Promise<IOjHomework> {
        const response = await this.request<{ homework: IOjHomework }>(
            `/homeworks/${encodeURIComponent(homeworkId)}`,
        );
        return response.homework;
    }

    public async getHomeworkLeaderboard(homeworkId: string): Promise<IOjLeaderboardEntry[]> {
        const response = await this.request<{ entries: IOjLeaderboardEntry[] }>(
            `/homeworks/${encodeURIComponent(homeworkId)}/leaderboard`,
        );
        return response.entries;
    }

    public async createSubmission(input: ICreateSubmissionRequest): Promise<IOjSubmission> {
        const response = await this.request<{ submission: IOjSubmission }>("/submissions", {
            method: "POST",
            body: JSON.stringify(Object.assign({ language: "py3" }, input)),
        });
        return response.submission;
    }

    public async getSubmission(submissionId: string): Promise<IOjSubmission> {
        const response = await this.request<{ submission: IOjSubmission }>(
            `/submissions/${encodeURIComponent(submissionId)}`,
        );
        return response.submission;
    }

    public async waitForSubmission(submissionId: string, options: IPollOptions = {}): Promise<IOjSubmission> {
        const intervalMs: number = options.intervalMs === undefined ? 1000 : options.intervalMs;
        const maxAttempts: number = options.maxAttempts || 120;
        for (let attempt: number = 0; attempt < maxAttempts; attempt++) {
            const submission: IOjSubmission = await this.getSubmission(submissionId);
            if (isTerminalSubmission(submission.status)) {
                return submission;
            }
            if (intervalMs > 0) {
                await delay(intervalMs);
            }
        }
        throw new Error(`OJ submission ${submissionId} did not finish in time.`);
    }

    private async request<T>(path: string, init: IRequestOptions = {}): Promise<T> {
        const headers: { [key: string]: string } = Object.assign({}, init.headers || {}, {
            "Content-Type": "application/json",
        });
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const response: IResponseLike = await this.requester(
            `${this.baseUrl}${path}`,
            Object.assign({}, init, { headers }),
        );
        const payload: any = await response.json();
        if (!response.ok) {
            const message: string = payload && payload.error && payload.error.message
                ? payload.error.message
                : `OJ API request failed with status ${response.status}`;
            throw new Error(message);
        }
        return payload as T;
    }
}
