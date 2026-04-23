export function extractIssueUrl(stdout: string): string | undefined {
  const m = stdout.match(/https?:\/\/\S+\/issues\/\d+/);
  return m?.[0];
}

// gh's GraphQL closeIssue mutation returns this message when the target is
// already CLOSED. Treated as a benign race: the idempotency contract of
// closeGithubIssue swallows it after confirming the live state.
export function isAlreadyClosedError(stderr: string): boolean {
  return /Could not close the issue/i.test(stderr);
}
