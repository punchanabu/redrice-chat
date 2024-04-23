-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "chatRooms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "chatRooms" TEXT[] DEFAULT ARRAY[]::TEXT[];
