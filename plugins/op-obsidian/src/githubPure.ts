export function extractIssueUrl(stdout: string): string | undefined {
  const m = stdout.match(/https?:\/\/\S+\/issues\/\d+/);
  return m?.[0];
}
