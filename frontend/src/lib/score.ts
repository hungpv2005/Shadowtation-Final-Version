import type { WordErrorType } from '@/types/api';

export type WordColor = 'green' | 'yellow' | 'red' | 'gray';

export interface Thresholds {
  greenMin: number; // mặc định 80 (system_configs: pronunciation.green_min)
  yellowMin: number; // mặc định 60 (system_configs: pronunciation.yellow_min)
}

const DEFAULTS: Thresholds = { greenMin: 80, yellowMin: 60 };

/**
 * Quy tắc tô màu từ theo SRS mục 3.3.3.2 (tính ở Frontend, không lưu màu trong DB):
 * - Omission (bỏ sót)                       -> xám
 * - điểm < yellowMin hoặc Mispronunciation  -> đỏ
 * - điểm >= greenMin và không lỗi           -> xanh
 * - còn lại                                 -> vàng
 */
export function wordColor(
  accuracy: number,
  errorType: WordErrorType,
  th: Thresholds = DEFAULTS,
): WordColor {
  if (errorType === 'Omission') return 'gray';
  if (accuracy < th.yellowMin || errorType === 'Mispronunciation') return 'red';
  if (accuracy >= th.greenMin && errorType === 'None') return 'green';
  return 'yellow';
}
