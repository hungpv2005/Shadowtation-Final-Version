import { WordErrorType, WordScore } from '../../database/entities/score.entity';

export type DiffOperation = 'MATCH' | 'SUBSTITUTION' | 'OMISSION' | 'INSERTION';
export interface DiffWord { reference: string; submitted: string; operation: DiffOperation }
export interface DictationResult { wer: number; accuracy: number; errors: number; words: WordScore[]; diff: DiffWord[]; reviewWords: string[] }

export function normalizeWords(value: string): string[] {
  return value.normalize('NFC').toLocaleLowerCase('en-US').replace(/[.,!?;:()[\]{}“”"'‘’…—–\-\/]/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function scoreDictation(referenceText: string, submittedText: string, penalty: number): DictationResult {
  const reference = normalizeWords(referenceText);
  const submitted = normalizeWords(submittedText);
  const costs = Array.from({ length: reference.length + 1 }, () => Array<number>(submitted.length + 1).fill(0));
  const back = Array.from({ length: reference.length + 1 }, () => Array<DiffOperation>(submitted.length + 1).fill('MATCH'));
  for (let i = 1; i <= reference.length; i++) { costs[i][0] = i; back[i][0] = 'OMISSION'; }
  for (let j = 1; j <= submitted.length; j++) { costs[0][j] = j; back[0][j] = 'INSERTION'; }
  for (let i = 1; i <= reference.length; i++) {
    for (let j = 1; j <= submitted.length; j++) {
      if (reference[i - 1] === submitted[j - 1]) { costs[i][j] = costs[i - 1][j - 1]; continue; }
      const candidates: [number, DiffOperation][] = [
        [costs[i - 1][j - 1] + 1, 'SUBSTITUTION'],
        [costs[i - 1][j] + 1, 'OMISSION'],
        [costs[i][j - 1] + 1, 'INSERTION'],
      ];
      const best = candidates.reduce((previous, current) => current[0] < previous[0] ? current : previous);
      costs[i][j] = best[0]; back[i][j] = best[1];
    }
  }
  const diff: DiffWord[] = [];
  let i = reference.length; let j = submitted.length;
  while (i || j) {
    const operation = back[i][j];
    if (i && j && (operation === 'MATCH' || operation === 'SUBSTITUTION')) {
      diff.push({ reference: reference[i - 1], submitted: submitted[j - 1], operation: reference[i - 1] === submitted[j - 1] ? 'MATCH' : 'SUBSTITUTION' }); i--; j--;
    } else if (i && (!j || operation === 'OMISSION')) { diff.push({ reference: reference[i - 1], submitted: '', operation: 'OMISSION' }); i--; }
    else { diff.push({ reference: '', submitted: submitted[j - 1], operation: 'INSERTION' }); j--; }
  }
  diff.reverse();
  const errors = costs[reference.length][submitted.length];
  const wer = reference.length ? errors / reference.length : submitted.length ? 1 : 0;
  const rawAccuracy = Math.max(0, Math.round((1 - wer) * 100));
  const words: WordScore[] = diff.map((item) => ({
    word: item.reference || item.submitted,
    accuracy_score: item.operation === 'MATCH' ? 100 : 0,
    error_type: ({ MATCH: 'None', SUBSTITUTION: 'Substitution', OMISSION: 'Omission', INSERTION: 'Insertion' } as Record<DiffOperation, WordErrorType>)[item.operation],
  }));
  return { wer, accuracy: Math.max(0, rawAccuracy - penalty), errors, words, diff, reviewWords: [...new Set(diff.filter((x) => x.operation === 'SUBSTITUTION' || x.operation === 'OMISSION').map((x) => x.reference))] };
}

export function hintPenalty(level: number, configured: unknown): number {
  const values = Array.isArray(configured) ? configured : [0, 5, 10, 20];
  const clamped = Math.max(0, Math.min(3, Math.floor(level)));
  const value = Number(values[clamped] ?? [0, 5, 10, 20][clamped]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : [0, 5, 10, 20][clamped];
}
