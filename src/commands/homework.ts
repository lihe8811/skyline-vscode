import * as vscode from "vscode";
import { createConfiguredOjApiClient } from "../api/ojApiConfig";
import { formatLeaderboardRows } from "../api/ojHomeworkFormat";
import { LeetCodeNode } from "../explorer/LeetCodeNode";

export async function showLeaderboard(node: LeetCodeNode): Promise<void> {
    const homeworkId: string = node.id.replace(/^Homework\./, "");
    const entries = await createConfiguredOjApiClient().getHomeworkLeaderboard(homeworkId);
    await vscode.window.showQuickPick(formatLeaderboardRows(entries), {
        placeHolder: `${node.name} leaderboard`,
        matchOnDescription: true,
        matchOnDetail: true,
    });
}
