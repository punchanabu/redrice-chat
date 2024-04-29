-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "role" TEXT,
    "password" TEXT,
    "chatRooms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "restaurant_id" BIGINT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatSessions" (
    "id" TEXT NOT NULL,
    "msgs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" BIGINT NOT NULL,
    "restaurantId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatSessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" BIGSERIAL NOT NULL,
    "date_time" TIMESTAMPTZ(6),
    "table_num" BIGINT,
    "exit_time" TIMESTAMPTZ(6),
    "user_id" BIGINT,
    "restaurant_id" BIGINT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "telephone" TEXT,
    "open_time" TEXT,
    "close_time" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "chatRooms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "usersId" BIGINT,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msgSessions" (
    "id" TEXT NOT NULL,
    "msg" TEXT,
    "senderId" BIGINT,
    "receiverId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "msgSessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_users_deleted_at" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "chatSessions_userId_idx" ON "chatSessions"("userId");

-- CreateIndex
CREATE INDEX "idx_reservations_deleted_at" ON "reservations"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_restaurants_deleted_at" ON "restaurants"("deleted_at");

-- AddForeignKey
ALTER TABLE "chatSessions" ADD CONSTRAINT "chatSessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatSessions" ADD CONSTRAINT "chatSessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
