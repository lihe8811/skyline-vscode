function response(statusCode, payload) {
  return {
    statusCode,
    json: () => payload,
  };
}

function registerSubmissionRoutes(app, { submissionService }) {
  app.register('POST', '/v1/submissions', async ({ body }) => {
    const created = await submissionService.createSubmission(body || {});
    return response(202, {
      submissionId: created.submissionId,
      status: 'pending',
    });
  });

  app.register('GET', '/v1/submissions/:submissionId', async ({ params }) => {
    const submission = await submissionService.getSubmission(params.submissionId);
    if (!submission) {
      return response(404, { error: 'Submission not found' });
    }
    return response(200, submission);
  });
}

module.exports = { registerSubmissionRoutes };
