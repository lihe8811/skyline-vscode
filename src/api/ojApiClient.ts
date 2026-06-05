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
    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
        return Promise.reject(new Error("Global fetch is not available in this extension host."));
    }
    return fetchFn(url, init);
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
