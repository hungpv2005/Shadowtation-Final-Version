export type DiffKind = 'correct' | 'substitution' | 'omission' | 'insertion';

export interface DiffToken {
  reference: string;
  submitted: string;
  kind: DiffKind;
}

export interface DictationScore {
  wer: number;
  accuracy: number;
  tokens: DiffToken[];
}

// Bộ nhớ đệm phân tích từ (Tokenization Cache)
const tokenCache = new Map<string, string[]>();
const MAX_TOKEN_CACHE = 200;

export function tokenize(value: string): string[] {
  if (!value) return [];
  const cached = tokenCache.get(value);
  if (cached) return cached;

  const clean = value
    .normalize('NFC')
    .toLocaleLowerCase('en-US')
    .replace(/[.,!?;:()[\]{}“”"'‘’…—–\-\/]/g, ' ')
    .trim();

  const tokens = clean ? clean.split(/\s+/) : [];

  if (tokenCache.size >= MAX_TOKEN_CACHE) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey) tokenCache.delete(firstKey);
  }
  tokenCache.set(value, tokens);
  return tokens;
}

const OP_MATCH = 0;
const OP_SUB = 1;
const OP_OMI = 2;
const OP_INS = 3;

// Bộ nhớ đệm kết quả so khớp Levenshtein (Memoization Cache)
const diffCache = new Map<string, DictationScore>();
const MAX_DIFF_CACHE = 150;

/**
 * Thuật toán so khớp chuỗi WER / Levenshtein hiệu năng cao:
 * - Sử dụng TypedArray (Int32Array & Uint8Array) loại bỏ hoàn toàn cấp phát mảng 2D (Zero-GC pressure).
 * - Tích hợp Memoization cache giúp trả kết quả tức thì trong < 1ms khi người dùng gõ phím.
 */
export function compareDictation(referenceText: string, submittedText: string): DictationScore {
  const cacheKey = `${referenceText}::${submittedText}`;
  const cached = diffCache.get(cacheKey);
  if (cached) return cached;

  const reference = tokenize(referenceText);
  const submitted = tokenize(submittedText);
  const rows = reference.length + 1;
  const cols = submitted.length + 1;
  const totalCells = rows * cols;

  // Sử dụng TypedArray liền kề trong bộ nhớ thay vì Array.from 2D
  const cost = new Int32Array(totalCells);
  const back = new Uint8Array(totalCells);

  for (let i = 1; i < rows; i++) {
    cost[i * cols] = i;
    back[i * cols] = OP_OMI;
  }
  for (let j = 1; j < cols; j++) {
    cost[j] = j;
    back[j] = OP_INS;
  }

  for (let i = 1; i < rows; i++) {
    const rowOffset = i * cols;
    const prevRowOffset = (i - 1) * cols;
    const refWord = reference[i - 1];

    for (let j = 1; j < cols; j++) {
      if (refWord === submitted[j - 1]) {
        cost[rowOffset + j] = cost[prevRowOffset + j - 1];
        back[rowOffset + j] = OP_MATCH;
      } else {
        const subCost = cost[prevRowOffset + j - 1] + 1;
        const omiCost = cost[prevRowOffset + j] + 1;
        const insCost = cost[rowOffset + j - 1] + 1;

        if (subCost <= omiCost && subCost <= insCost) {
          cost[rowOffset + j] = subCost;
          back[rowOffset + j] = OP_SUB;
        } else if (omiCost <= insCost) {
          cost[rowOffset + j] = omiCost;
          back[rowOffset + j] = OP_OMI;
        } else {
          cost[rowOffset + j] = insCost;
          back[rowOffset + j] = OP_INS;
        }
      }
    }
  }

  const aligned: DiffToken[] = [];
  let i = reference.length;
  let j = submitted.length;
  while (i || j) {
    const op = back[i * cols + j];
    if (i && j && (op === OP_MATCH || op === OP_SUB)) {
      aligned.push({
        reference: reference[i - 1],
        submitted: submitted[j - 1],
        kind: op === OP_MATCH ? 'correct' : 'substitution',
      });
      i--;
      j--;
    } else if (i && (!j || op === OP_OMI)) {
      aligned.push({ reference: reference[i - 1], submitted: '', kind: 'omission' });
      i--;
    } else {
      aligned.push({ reference: '', submitted: submitted[j - 1], kind: 'insertion' });
      j--;
    }
  }
  aligned.reverse();

  const errors = cost[reference.length * cols + submitted.length];
  const wer = reference.length ? errors / reference.length : (submitted.length ? 1 : 0);
  const result: DictationScore = {
    wer,
    accuracy: Math.max(0, Math.round((1 - wer) * 100)),
    tokens: aligned,
  };

  if (diffCache.size >= MAX_DIFF_CACHE) {
    const firstKey = diffCache.keys().next().value;
    if (firstKey) diffCache.delete(firstKey);
  }
  diffCache.set(cacheKey, result);

  return result;
}

export function hintPenalty(level: number, penalties: number[] = [0, 5, 10, 20]): number {
  return penalties[Math.min(Math.max(level, 0), 3)] ?? [0, 5, 10, 20][Math.min(Math.max(level, 0), 3)];
}

export function maskedHint(reference: string, level: number): string {
  if (level <= 0) return '';
  let wordIndex = 0;
  return reference.replace(/[A-Za-z0-9]+|[^A-Za-z0-9]+/g, (part) => {
    if (!/[A-Za-z0-9]/.test(part)) return part;
    const letters = Array.from(part);
    const currentIndex = wordIndex++;
    if (level >= 3 && currentIndex === 0) return part;
    if (level >= 2) return `${letters[0]}${'＿'.repeat(Math.max(1, letters.length - 1))}`;
    return '＿'.repeat(Math.min(letters.length, 16));
  });
}
