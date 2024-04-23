-- AlterTable
ALTER TABLE "chatSessions" ADD COLUMN     "msgs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "msgSessions" (
    "id" BIGSERIAL NOT NULL,
    "msg" TEXT,
    "senderId" BIGINT,
    "receiverId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "msgSessions_pkey" PRIMARY KEY ("id")
);
