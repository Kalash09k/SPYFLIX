/*
  Warnings:

  - The primary key for the `SubscriptionGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `SubscriptionGroup` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SubscriptionGroup` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SubscriptionGroup` table. All the data in the column will be lost.
  - Added the required column `availableSlots` to the `SubscriptionGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `SubscriptionGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan` to the `SubscriptionGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerSlot` to the `SubscriptionGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceName` to the `SubscriptionGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSlots` to the `SubscriptionGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."SubscriptionGroup" DROP CONSTRAINT "SubscriptionGroup_userId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "subscriptionGroupId" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionGroup" DROP CONSTRAINT "SubscriptionGroup_pkey",
DROP COLUMN "name",
DROP COLUMN "type",
DROP COLUMN "userId",
ADD COLUMN     "availableSlots" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ownerId" INTEGER NOT NULL,
ADD COLUMN     "plan" TEXT NOT NULL,
ADD COLUMN     "pricePerSlot" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "serviceName" TEXT NOT NULL,
ADD COLUMN     "totalSlots" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SubscriptionGroup_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SubscriptionGroup_id_seq";

-- AddForeignKey
ALTER TABLE "SubscriptionGroup" ADD CONSTRAINT "SubscriptionGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_subscriptionGroupId_fkey" FOREIGN KEY ("subscriptionGroupId") REFERENCES "SubscriptionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
