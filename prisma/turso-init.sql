-- Apply once on Turso: turso db shell <database-name> < prisma/turso-init.sql

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

CREATE TABLE IF NOT EXISTS "ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "closureMode" TEXT NOT NULL DEFAULT 'shabbat_and_holidays',
    "geonameId" INTEGER NOT NULL DEFAULT 293397,
    "updatedAt" DATETIME NOT NULL
);
