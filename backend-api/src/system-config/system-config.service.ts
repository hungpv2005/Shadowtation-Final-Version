import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../database/entities/system-config.entity';

export interface SystemConfigItem {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt?: Date;
}

export const DEFAULT_SYSTEM_CONFIGS: Array<{ key: string; value: unknown; description: string }> = [
  {
    key: 'pronunciation.green_min',
    value: 80,
    description: 'Điểm từ tối thiểu để đạt màu Xanh (Phát âm chuẩn xác)',
  },
  {
    key: 'pronunciation.yellow_min',
    value: 60,
    description: 'Điểm từ tối thiểu để đạt màu Vàng (Cần cải thiện; dưới mức này là Đỏ - Sai)',
  },
  {
    key: 'review.add_threshold',
    value: 60,
    description: 'Từ có điểm phát âm dưới ngưỡng này tự động thêm vào Sổ từ vựng ôn tập',
  },
  {
    key: 'ai.timeout_seconds',
    value: 30,
    description: 'Thời gian chờ tối đa (giây) khi gọi dịch vụ AI chấm điểm phát âm',
  },
  {
    key: 'free.shadowing_daily_limit',
    value: 5,
    description: 'Số lượt chấm AI Shadowing tối đa mỗi ngày của tài khoản Học viên Miễn phí',
  },
  {
    key: 'free.review_list_limit',
    value: 10,
    description: 'Số mục từ vựng tối đa trong Sổ ôn tập của tài khoản Học viên Miễn phí',
  },
  {
    key: 'dictation.hint_penalties',
    value: [0, 5, 10, 20],
    description: 'Mức trừ điểm theo số lần sử dụng gợi ý Dictation (Lần 1, 2, 3...)',
  },
];

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  /**
   * Lấy toàn bộ danh sách cấu hình. Nếu thiếu key mặc định, tự động seed bổ sung.
   */
  async getAll(): Promise<SystemConfigItem[]> {
    const existing = await this.configRepository.find({
      order: { key: 'ASC' },
    });

    const existingKeys = new Set(existing.map((item) => item.key));
    const missing = DEFAULT_SYSTEM_CONFIGS.filter((def) => !existingKeys.has(def.key));

    if (missing.length > 0) {
      for (const item of missing) {
        const entity = this.configRepository.create({
          key: item.key,
          value: item.value,
          description: item.description,
        });
        await this.configRepository.save(entity);
        existing.push(entity);
      }
    }

    return existing.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Lấy cấu hình theo key
   */
  async getByKey(key: string): Promise<SystemConfig> {
    const config = await this.configRepository.findOneBy({ key });
    if (!config) {
      const defaultItem = DEFAULT_SYSTEM_CONFIGS.find((item) => item.key === key);
      if (defaultItem) {
        const entity = this.configRepository.create({
          key: defaultItem.key,
          value: defaultItem.value,
          description: defaultItem.description,
        });
        return this.configRepository.save(entity);
      }
      throw new NotFoundException(`Không tìm thấy cấu hình với mã: ${key}`);
    }
    return config;
  }

  /**
   * Validate giá trị cấu hình theo nghiệp vụ SRS
   */
  private validateValue(key: string, value: unknown): void {
    if (key === 'pronunciation.green_min' || key === 'pronunciation.yellow_min' || key === 'review.add_threshold') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        throw new BadRequestException(`Ngưỡng điểm "${key}" phải là số từ 0 đến 100.`);
      }
    }

    if (key === 'ai.timeout_seconds') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 5 || num > 300) {
        throw new BadRequestException(`Thời gian chờ AI timeout phải từ 5 đến 300 giây.`);
      }
    }

    if (key === 'free.shadowing_daily_limit' || key === 'free.review_list_limit') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 1000) {
        throw new BadRequestException(`Giới hạn "${key}" phải là số nguyên không âm (tối đa 1000).`);
      }
    }

    if (key === 'dictation.hint_penalties') {
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'number' || v < 0 || v > 100)) {
        throw new BadRequestException('Mức trừ điểm gợi ý phải là một mảng các số từ 0 đến 100 (Ví dụ: [0, 5, 10, 20]).');
      }
    }
  }

  /**
   * Cập nhật 1 cấu hình
   */
  async update(key: string, value: unknown, description?: string): Promise<SystemConfig> {
    this.validateValue(key, value);

    let config = await this.configRepository.findOneBy({ key });
    if (!config) {
      const defaultItem = DEFAULT_SYSTEM_CONFIGS.find((item) => item.key === key);
      config = this.configRepository.create({
        key,
        value,
        description: description ?? defaultItem?.description ?? null,
      });
    } else {
      config.value = value;
      if (description !== undefined) {
        config.description = description;
      }
    }

    return this.configRepository.save(config);
  }

  /**
   * Cập nhật nhiều cấu hình cùng lúc
   */
  async updateBatch(items: Array<{ key: string; value: unknown; description?: string }>): Promise<SystemConfigItem[]> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Danh sách cấu hình cần cập nhật không được rỗng.');
    }

    for (const item of items) {
      this.validateValue(item.key, item.value);
    }

    for (const item of items) {
      await this.update(item.key, item.value, item.description);
    }

    return this.getAll();
  }

  /**
   * Khôi phục toàn bộ cấu hình về giá trị mặc định ban đầu
   */
  async resetToDefaults(): Promise<SystemConfigItem[]> {
    for (const item of DEFAULT_SYSTEM_CONFIGS) {
      let config = await this.configRepository.findOneBy({ key: item.key });
      if (!config) {
        config = this.configRepository.create(item);
      } else {
        config.value = item.value;
        config.description = item.description;
      }
      await this.configRepository.save(config);
    }

    return this.getAll();
  }
}
