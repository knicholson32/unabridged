import { PrismaClient } from '@prisma/client';

console.log('Init', process.env);

export default new PrismaClient();
