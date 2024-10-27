/*
  Warnings:

  - You are about to drop the `ForbiddenPasswords` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ForbiddenPasswords";

-- CreateTable
CREATE TABLE "CommonPasswords" (
    "password" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CommonPasswords_password_key" ON "CommonPasswords"("password");
