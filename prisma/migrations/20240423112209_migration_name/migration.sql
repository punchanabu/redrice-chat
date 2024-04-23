/*
  Warnings:

  - The primary key for the `msgSessions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "msgSessions" DROP CONSTRAINT "msgSessions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "msgSessions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "msgSessions_id_seq";
