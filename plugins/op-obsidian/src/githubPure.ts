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

// Mirrors GitHub's two state-reason values for closed issues:
//   - "completed"   — work shipped (op status `resolved`)
//   - "not planned" — won't ship (op status `wontfix`)
// Anything else falls back to "completed" so a future op status doesn't
// silently lose the reason; callers should pass `resolved` or `wontfix`.
export type GithubCloseReason = "completed" | "not planned";

export function closeReasonForStatus(status: string): GithubCloseReason {
  return status === "wontfix" ? "not planned" : "completed";
}
