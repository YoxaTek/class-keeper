/*
  Warnings:

  - You are about to drop the `JoinRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "JoinRequest" DROP CONSTRAINT "JoinRequest_termId_fkey";

-- DropTable
DROP TABLE "JoinRequest";
