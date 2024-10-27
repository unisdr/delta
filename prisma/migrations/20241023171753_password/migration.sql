-- CreateTable
CREATE TABLE "ForbiddenPasswords" (
    "password" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ForbiddenPasswords_password_key" ON "ForbiddenPasswords"("password");
