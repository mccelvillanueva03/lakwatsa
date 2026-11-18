-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TripMode" AS ENUM ('PLANNING', 'PLANNED');

-- CreateTable
CREATE TABLE "Planner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "salt" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerSession" (
    "id" TEXT NOT NULL,
    "plannerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "plannerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "accessCodeHash" TEXT NOT NULL,
    "accessCodeVersion" INTEGER NOT NULL DEFAULT 1,
    "mode" "TripMode" NOT NULL,
    "timezone" TEXT NOT NULL,
    "contributionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "chosenDestinationId" TEXT,
    "chosenDateId" TEXT,
    "chosenContributionId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "destinationVoteId" TEXT,
    "dateVoteId" TEXT,
    "contributionVoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSession" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Planner_email_key" ON "Planner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Planner_username_key" ON "Planner"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerSession_tokenHash_key" ON "PlannerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PlannerSession_plannerId_idx" ON "PlannerSession"("plannerId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_accessCodeHash_key" ON "Trip"("accessCodeHash");

-- CreateIndex
CREATE INDEX "Trip_plannerId_idx" ON "Trip"("plannerId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_tripId_name_key" ON "Member"("tripId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSession_memberId_key" ON "MemberSession"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSession_tokenHash_key" ON "MemberSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationOption_tripId_name_key" ON "DestinationOption"("tripId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationOption_tripId_id_key" ON "DestinationOption"("tripId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DateOption_tripId_start_end_key" ON "DateOption"("tripId", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "DateOption_tripId_id_key" ON "DateOption"("tripId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionOption_tripId_amount_key" ON "ContributionOption"("tripId", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionOption_tripId_id_key" ON "ContributionOption"("tripId", "id");

-- AddForeignKey
ALTER TABLE "PlannerSession" ADD CONSTRAINT "PlannerSession_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "Planner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_chosenDestinationId_fkey" FOREIGN KEY ("chosenDestinationId") REFERENCES "DestinationOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_chosenDateId_fkey" FOREIGN KEY ("chosenDateId") REFERENCES "DateOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_chosenContributionId_fkey" FOREIGN KEY ("chosenContributionId") REFERENCES "ContributionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_destinationVoteId_fkey" FOREIGN KEY ("destinationVoteId") REFERENCES "DestinationOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_dateVoteId_fkey" FOREIGN KEY ("dateVoteId") REFERENCES "DateOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_contributionVoteId_fkey" FOREIGN KEY ("contributionVoteId") REFERENCES "ContributionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSession" ADD CONSTRAINT "MemberSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationOption" ADD CONSTRAINT "DestinationOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateOption" ADD CONSTRAINT "DateOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionOption" ADD CONSTRAINT "ContributionOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Member" ADD CONSTRAINT "Member_amountPaid_nonnegative" CHECK ("amountPaid" >= 0);
ALTER TABLE "ContributionOption" ADD CONSTRAINT "ContributionOption_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "DateOption" ADD CONSTRAINT "DateOption_valid_window" CHECK ("end" > "start");
ALTER TABLE "Member" ADD CONSTRAINT "Member_destination_same_trip" FOREIGN KEY ("tripId", "destinationVoteId") REFERENCES "DestinationOption" ("tripId", "id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Member" ADD CONSTRAINT "Member_date_same_trip" FOREIGN KEY ("tripId", "dateVoteId") REFERENCES "DateOption" ("tripId", "id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Member" ADD CONSTRAINT "Member_contribution_same_trip" FOREIGN KEY ("tripId", "contributionVoteId") REFERENCES "ContributionOption" ("tripId", "id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destination_same_trip" FOREIGN KEY ("id", "chosenDestinationId") REFERENCES "DestinationOption" ("tripId", "id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_date_same_trip" FOREIGN KEY ("id", "chosenDateId") REFERENCES "DateOption" ("tripId", "id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_contribution_same_trip" FOREIGN KEY ("id", "chosenContributionId") REFERENCES "ContributionOption" ("tripId", "id") DEFERRABLE INITIALLY DEFERRED;
