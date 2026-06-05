function normalizeOutput(value) {
  return String(value || '').replace(/\s+$/u, '');
}

function mapSandboxResult({ caseNo, sandboxResult, expectedOutput }) {
  const timeMs = Number(sandboxResult.timeMs || 0);
  const memoryKb = Number(sandboxResult.memoryKb || 0);

  if (sandboxResult.timedOut) {
    return { caseNo, status: 'time_limit_exceeded', timeMs, memoryKb };
  }

  if (sandboxResult.exitCode !== 0) {
    return { caseNo, status: 'runtime_error', timeMs, memoryKb };
  }

  if (normalizeOutput(sandboxResult.stdout) !== normalizeOutput(expectedOutput)) {
    return { caseNo, status: 'wrong_answer', timeMs, memoryKb };
  }

  return { caseNo, status: 'accepted', timeMs, memoryKb };
}

module.exports = { mapSandboxResult };
