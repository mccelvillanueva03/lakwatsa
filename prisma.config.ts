import 'dotenv/config';
import { definePrismaConfig } from 'prisma/config';
import { defineConfig } from '@prisma/orm-postgres/config';
export default definePrismaConfig({orm:defineConfig({contract:'prisma/contract.prisma',output:'prisma/generated',db:{connection:process.env.DATABASE_URL},migrations:{dir:'prisma/migrations-v8'}})});
