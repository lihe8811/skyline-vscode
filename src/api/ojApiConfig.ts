import * as vscode from "vscode";
import { OjApiClient } from "./ojApiClient";

let sessionToken: string | undefined;

export function getOjBackendUrl(): string | undefined {
    return vscode.workspace.getConfiguration("skylineOj").get<string>("backendUrl");
}

export function getOjToken(): string | undefined {
    return sessionToken;
}

export function setOjSessionToken(token: string | undefined): void {
    sessionToken = token;
}

export function isOjBackendEnabled(): boolean {
    const backendUrl: string | undefined = getOjBackendUrl();
    return !!backendUrl && backendUrl.trim().length > 0;
}

export function createConfiguredOjApiClient(): OjApiClient {
    const backendUrl: string | undefined = getOjBackendUrl();
    if (!backendUrl) {
        throw new Error("skylineOj.backendUrl is not configured.");
    }
    return new OjApiClient({ baseUrl: backendUrl, token: getOjToken() });
}

export function createAnonymousOjApiClient(): OjApiClient {
    const backendUrl: string | undefined = getOjBackendUrl();
    if (!backendUrl) {
        throw new Error("skylineOj.backendUrl is not configured.");
    }
    return new OjApiClient({ baseUrl: backendUrl });
}
