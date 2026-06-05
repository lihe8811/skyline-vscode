function parseCasePairs(configText) {
  const lines = String(configText || '').split(/\r?\n/);
  const pairs = [];
  let currentInput = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const inputMatch = line.match(/^(?:-\s*)?input:\s*(.+)$/);
    if (inputMatch) {
      currentInput = inputMatch[1].trim();
      continue;
    }

    const outputMatch = line.match(/^(?:-\s*)?output:\s*(.+)$/);
    if (outputMatch && currentInput) {
      pairs.push({ input: currentInput, output: outputMatch[1].trim() });
      currentInput = null;
    }
  }

  return pairs;
}

function transformProblemsAndTestcases(raw) {
  const documents = raw.documents || [];
  const storage = raw.storage || [];

  const storageByPath = new Map(storage.map((item) => [item.path, item]));

  const problems = [];
  const problemTestcases = [];

  for (const doc of documents) {
    if (doc.docType !== 10) {
      continue;
    }

    const problemId = Number(doc.docId);
    problems.push({
      problemId,
      title: doc.title || `Problem ${problemId}`,
      difficulty: Number(doc.difficulty || 1),
      statement: String(doc.content || ''),
      tags: Array.isArray(doc.tag) ? doc.tag : [],
    });

    const casePairs = parseCasePairs(doc.config);
    for (let i = 0; i < casePairs.length; i += 1) {
      const pair = casePairs[i];
      const inputPath = `problem/system/${problemId}/testdata/${pair.input}`;
      const outputPath = `problem/system/${problemId}/testdata/${pair.output}`;
      const inputFile = storageByPath.get(inputPath);
      const outputFile = storageByPath.get(outputPath);
      if (!inputFile || !outputFile) {
        continue;
      }

      problemTestcases.push({
        problemId,
        caseNo: i + 1,
        inputFileId: inputFile._id,
        outputFileId: outputFile._id,
        isHidden: true,
      });
    }
  }

  return { problems, problemTestcases };
}

module.exports = { transformProblemsAndTestcases };
