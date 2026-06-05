function resolveAssignee(rawAssignee) {
  const value = String(rawAssignee);
  if (value.startsWith('g')) {
    return { assigneeType: 'group', assigneeId: value };
  }
  if (value.startsWith('u')) {
    return { assigneeType: 'user', assigneeId: value };
  }
  if (/^\d+$/.test(value)) {
    return { assigneeType: 'user', assigneeId: value };
  }
  return { assigneeType: 'group', assigneeId: value };
}

function transformHomeworksAndScores(raw) {
  const homeworks = [];
  const homeworkAssignments = [];
  const homeworkScores = [];
  const homeworkProblemScores = [];

  for (const doc of raw.documents || []) {
    if (doc.docType !== 30) continue;
    homeworks.push({
      homeworkId: String(doc.docId),
      title: doc.title || String(doc.docId),
      problemIds: Array.isArray(doc.pids) ? doc.pids.map((x) => Number(x)) : [],
      startAt: doc.beginAt || null,
      dueAt: doc.endAt || null,
    });

    for (const assignee of doc.assign || []) {
      const normalized = resolveAssignee(assignee);
      homeworkAssignments.push({ homeworkId: String(doc.docId), ...normalized });
    }
  }

  for (const status of raw.documentStatus || []) {
    if (status.docType !== 30) continue;
    const homeworkId = String(status.docId);
    const userId = Number(status.uid);

    homeworkScores.push({
      homeworkId,
      userId,
      totalScore: Number(status.score || 0),
      totalTimeMs: Number(status.time || 0),
    });

    for (const key of Object.keys(status.detail || {})) {
      const item = status.detail[key] || {};
      homeworkProblemScores.push({
        homeworkId,
        userId,
        problemId: Number(item.pid || key),
        score: Number(item.score || 0),
        timeMs: Number(item.time || 0),
        rid: item.rid || null,
        status: item.status ?? null,
      });
    }
  }

  homeworkProblemScores.sort((a, b) => a.problemId - b.problemId);

  return { homeworks, homeworkAssignments, homeworkScores, homeworkProblemScores };
}

module.exports = { transformHomeworksAndScores };
