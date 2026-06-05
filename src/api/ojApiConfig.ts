import * as vscode from "vscode";
import { OjApiClient } from "./ojApiClient";

export function getOjBackendUrl(): string | undefined {
    return vscode.workspace.getConfiguration("skylineOj").get<string>("backendUrl");
}

export function getOjToken(): string | undefined {
    return vscode.workspace.getConfiguration("skylineOj").get<string>("token");
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
