import { PrismaClient } from '@prisma/client';

export function testPrismaClient(){
	return new PrismaClient();
}
