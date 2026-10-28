import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type JwtClaims = { sub?: string; exp?: number; nbf?: number; [key: string]: unknown };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    this.authenticate(request);
    return true;
  }

  protected authenticate(request: any): void {
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!token || !secret || secret.length < 32) throw new UnauthorizedException('JWT đăng nhập không hợp lệ.');

    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('JWT đăng nhập không hợp lệ.');
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string };
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtClaims;
      if (header.alg !== 'HS256' || typeof claims.sub !== 'string' || !claims.sub || !Number.isFinite(claims.exp)) throw new Error('Unsupported token');
      const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
      const supplied = Buffer.from(parts[2], 'base64url');
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Invalid signature');
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp! <= now || (claims.nbf !== undefined && claims.nbf > now)) throw new Error('Expired token');
      request.user = { ...claims, id: claims.sub };
    } catch {
      throw new UnauthorizedException('JWT đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  constructor(config: ConfigService) {
    super(config);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.headers.authorization) {
      request.user = undefined;
      return true;
    }
    try {
      this.authenticate(request);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      // An expired browser token should not prevent guests from browsing public lessons.
      request.user = undefined;
    }
    return true;
  }
}
