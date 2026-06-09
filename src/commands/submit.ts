// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { createConfiguredOjApiClient, isOjBackendEnabled } from "../api/ojApiConfig";
import { leetCodeTreeDataProvider } from "../explorer/LeetCodeTreeDataProvider";
import { leetCodeExecutor } from "../leetCodeExecutor";
import { leetCodeManager } from "../leetCodeManager";
import { getNodeIdFromFile } from "../utils/problemUtils";
import { DialogType, promptForOpenOutputChannel, promptForSignIn } from "../utils/uiUtils";
import { getActiveFilePath } from "../utils/workspaceUtils";
import { leetCodeSubmissionProvider } from "../webview/leetCodeSubmissionProvider";

export async function submitSolution(uri?: vscode.Uri): Promise<void> {
    if (!leetCodeManager.getUser()) {
        promptForSignIn();
        return;
    }

    const filePath: string | undefined = await getActiveFilePath(uri);
    if (!filePath) {
        return;
    }

    try {
        if (isOjBackendEnabled()) {
            const problemId: number = Number(await getNodeIdFromFile(filePath));
            if (!Number.isFinite(problemId)) {
                vscode.window.showErrorMessage(`Failed to resolve numeric problem id from file: ${filePath}.`);
                return;
            }

            const sourceCode: string = await fse.readFile(filePath, "utf8");
            const created = await createConfiguredOjApiClient().createSubmission({ problemId, sourceCode });
            const submissionResult = await createConfiguredOjApiClient().getSubmission(created.submissionId);
            leetCodeSubmissionProvider.show(JSON.stringify(submissionResult, null, 2));
            leetCodeTreeDataProvider.refresh();
            return;
        }

        const result: string = await leetCodeExecutor.submitSolution(filePath);
        leetCodeSubmissionProvider.show(result);
    } catch (error) {
        await promptForOpenOutputChannel("Failed to submit the solution. Please open the output channel for details.", DialogType.error);
        return;
    }

    leetCodeTreeDataProvider.refresh();
}
