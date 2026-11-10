export interface KeyCandidate {
  path: string;
  key: string;
}
export function resolveKeyCandidates(preferred: string): Promise<KeyCandidate[]>;
export function main(argv: string[]): Promise<void>;
