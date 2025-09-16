/*
  Warnings:

  - A unique constraint covering the columns `[team,name]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Player_team_name_key" ON "public"."Player"("team", "name");
