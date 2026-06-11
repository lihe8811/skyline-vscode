import { IOjProblem } from "./ojApiClient";

export interface IOjFileMetadata {
    problemId: string;
    homeworkId?: string;
}

function commentStatement(statement: string): string {
    return statement.split(/\r?\n/).map((line: string) => `# ${line}`.trimEnd()).join("\n");
}

export function parseOjFileMetadata(sourceCode: string): IOjFileMetadata | undefined {
    const marker: RegExpMatchArray | null = sourceCode.match(
        /@lc app=skyline id=(\S+)(?: homework=(\S+))? lang=python3/,
    );
    if (!marker) {
        return undefined;
    }
    return {
        problemId: marker[1],
        homeworkId: marker[2],
    };
}

export function renderOjPythonFile(problem: IOjProblem, homeworkId?: string): string {
    const homeworkMarker: string = homeworkId ? ` homework=${homeworkId}` : "";
    return [
        `# @lc app=skyline id=${problem.id}${homeworkMarker} lang=python3`,
        `# ${problem.title}`,
        "#",
        commentStatement(problem.statement || ""),
        "",
        "",
        "def solve() -> None:",
        "    pass",
        "",
        "",
        "if __name__ == \"__main__\":",
        "    solve()",
        "",
    ].join("\n");
}
