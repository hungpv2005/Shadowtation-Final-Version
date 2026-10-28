import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { name: string; version: string; description: string } {
    return {
      name: 'Shadowtation API',
      version: '1.0.0',
      description: 'Core API & Speech Assessment for Shadowtation Platform',
    };
  }
}
