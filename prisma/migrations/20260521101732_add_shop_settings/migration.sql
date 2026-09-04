-- CreateTable
CREATE TABLE "ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "closureMode" TEXT NOT NULL DEFAULT 'shabbat_and_holidays',
    "geonameId" INTEGER NOT NULL DEFAULT 293397,
    "updatedAt" DATETIME NOT NULL
);
