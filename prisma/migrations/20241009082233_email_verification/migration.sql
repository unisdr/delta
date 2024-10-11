-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificationCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00';
