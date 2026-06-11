import { IOjLeaderboardEntry } from "./ojApiClient";

export interface ILeaderboardRow {
    label: string;
    description: string;
    detail: string;
}

export function formatLeaderboardRows(entries: IOjLeaderboardEntry[]): ILeaderboardRow[] {
    return entries.map((entry: IOjLeaderboardEntry, index: number) => ({
        label: `${index + 1}. ${entry.displayName}`,
        description: `${entry.score} points`,
        detail: `${entry.solved} solved`,
    }));
}
