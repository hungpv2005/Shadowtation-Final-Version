import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Đọc .env ở backend-api/ trước, nếu không có thì đọc .env ở thư mục gốc dự án
config({ path: ['.env', '../.env'] });

/**
 * DataSource dùng cho TypeORM CLI (migration:generate / migration:run) và seed.
 * Ứng dụng NestJS cấu hình kết nối riêng trong app.module.ts với cùng tham số.
 */
const databaseUrl = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE ?? 'shadowtation',
      }),
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  uuidExtension: 'pgcrypto', // dùng gen_random_uuid() như SRS
  synchronize: false, // schema chỉ thay đổi qua migration
  logging: ['error', 'warn', 'migration'],
});
