/*
  Warnings:

  - You are about to drop the column `authorId` on the `Item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_authorId_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "authorId";
