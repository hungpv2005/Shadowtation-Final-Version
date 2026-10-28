import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan, PaymentTransaction } from '../database/entities';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
  ) {}

  /**
   * Lấy danh sách gói cước đang mở bán (Active) cho học viên
   */
  async findAllActive(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { durationDays: 'ASC' },
    });
  }

  /**
   * Lấy tất cả gói cước cho trang quản trị Admin (bao gồm cả các gói đã ẩn/tắt)
   */
  async findAllAdmin(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      order: { durationDays: 'ASC' },
    });
  }

  /**
   * Lấy chi tiết một gói cước theo ID
   */
  async findById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Không tìm thấy gói cước với ID: ${id}`);
    }
    return plan;
  }

  /**
   * Admin tạo mới gói cước
   */
  async create(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = this.planRepository.create({
      name: dto.name.trim(),
      price: dto.price.toString(),
      durationDays: dto.durationDays,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.planRepository.save(plan);
  }

  /**
   * Admin cập nhật thông tin gói cước
   */
  async update(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = await this.findById(id);

    if (dto.name !== undefined) {
      plan.name = dto.name.trim();
    }
    if (dto.price !== undefined) {
      plan.price = dto.price.toString();
    }
    if (dto.durationDays !== undefined) {
      plan.durationDays = dto.durationDays;
    }
    if (dto.isActive !== undefined) {
      plan.isActive = dto.isActive;
    }

    return this.planRepository.save(plan);
  }

  /**
   * Admin xóa hoặc chuyển trạng thái ẩn gói cước
   * - Nếu gói cước đã có giao dịch liên kết: Chuyển isActive = false để bảo vệ tính toàn vẹn dữ liệu
   * - Nếu gói cước chưa từng có giao dịch: Xóa vĩnh viễn khỏi cơ sở dữ liệu
   */
  async deleteOrDeactivate(id: string): Promise<{ success: boolean; message: string; action: 'DEACTIVATED' | 'DELETED' }> {
    const plan = await this.findById(id);

    // Kiểm tra xem gói cước đã từng phát sinh giao dịch thanh toán hay chưa
    const txCount = await this.transactionRepository.count({ where: { planId: id } });

    if (txCount > 0) {
      plan.isActive = false;
      await this.planRepository.save(plan);
      return {
        success: true,
        action: 'DEACTIVATED',
        message: `Gói cước "${plan.name}" đã có ${txCount} giao dịch trong lịch sử nên được chuyển sang trạng thái Ẩn (Không mở bán), dữ liệu kế toán được bảo toàn.`,
      };
    }

    await this.planRepository.delete(id);
    return {
      success: true,
      action: 'DELETED',
      message: `Đã xóa vĩnh viễn gói cước "${plan.name}".`,
    };
  }
}
