import { IOjHomework, IOjProblem } from "./ojApiClient";

export interface IOjHomeworkTreeNode {
    id: string;
    homeworkId: string;
    title: string;
    problems: IOjProblem[];
}

export function buildHomeworkTree(homeworks: IOjHomework[]): IOjHomeworkTreeNode[] {
    return homeworks.map((homework: IOjHomework) => ({
        id: `Homework.${homework.id}`,
        homeworkId: homework.id,
        title: homework.title,
        problems: homework.problems || [],
    }));
}
