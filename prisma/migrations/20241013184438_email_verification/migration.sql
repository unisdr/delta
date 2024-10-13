-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetPasswordExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
ADD COLUMN     "resetPasswordToken" TEXT NOT NULL DEFAULT '';
