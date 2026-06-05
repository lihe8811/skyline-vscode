function buildDockerSandboxCommand({ workDir, timeMs, memoryMb }) {
  const seconds = Math.max(1, Math.ceil(Number(timeMs || 1000) / 1000));
  const memory = `${Number(memoryMb || 64)}m`;

  return {
    command: 'docker',
    args: [
      'run',
      '--rm',
      '--network=none',
      `--memory=${memory}`,
      '--pids-limit=64',
      '--cpus=1',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=32m',
      '-v',
      `${workDir}:/work:ro`,
      '-w',
      '/work',
      'python:3.11',
      'timeout',
      `${seconds}s`,
      'python3',
      'main.py',
    ],
  };
}

module.exports = { buildDockerSandboxCommand };
