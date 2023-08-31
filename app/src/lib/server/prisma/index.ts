import { PrismaClient } from '@prisma/client'; 

// TODO: Should this get set by a server hook instead of statically?
// PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>
export default new PrismaClient();