#!/usr/bin/env tsx

/**
 * Script to check for duplicate data before adding unique constraints
 * This script identifies and reports duplicates in:
 * - universe.symbol
 * - risk_group.name
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('🔍 Checking for duplicates before adding unique constraints...\n');

  // Check for duplicate universe symbols
  console.log('📊 Checking universe.symbol duplicates:');
  const universeSymbolDuplicates = await prisma.$queryRaw<
    { symbol: string; count: number }[]
  >`
    SELECT symbol, COUNT(*) as count
    FROM universe
    WHERE deletedAt IS NULL
    GROUP BY symbol
    HAVING COUNT(*) > 1
  `;

  if (universeSymbolDuplicates.length > 0) {
    console.log('❌ Found duplicate symbols in universe table:');
    universeSymbolDuplicates.forEach((dup) => {
      console.log(`  - ${dup.symbol}: ${dup.count} records`);
    });
  } else {
    console.log('✅ No duplicate symbols found in universe table');
  }

  // Check for duplicate risk group names
  console.log('\n📊 Checking risk_group.name duplicates:');
  const riskGroupNameDuplicates = await prisma.$queryRaw<
    { name: string; count: number }[]
  >`
    SELECT name, COUNT(*) as count
    FROM risk_group
    WHERE deletedAt IS NULL
    GROUP BY name
    HAVING COUNT(*) > 1
  `;

  if (riskGroupNameDuplicates.length > 0) {
    console.log('❌ Found duplicate names in risk_group table:');
    riskGroupNameDuplicates.forEach((dup) => {
      console.log(`  - ${dup.name}: ${dup.count} records`);
    });
  } else {
    console.log('✅ No duplicate names found in risk_group table');
  }

  const hasAnyDuplicates = 
    universeSymbolDuplicates.length > 0 || riskGroupNameDuplicates.length > 0;

  if (hasAnyDuplicates) {
    console.log('\n⚠️  Manual deduplication required before applying unique constraints');
    console.log('Consider merging or removing duplicate records based on business logic');
    process.exit(1);
  } else {
    console.log('\n🎉 No duplicates found - safe to proceed with unique constraints');
  }
}

checkDuplicates()
  .catch((error) => {
    console.error('💥 Error checking duplicates:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });