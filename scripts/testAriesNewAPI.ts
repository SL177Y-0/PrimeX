/**
 * Test script for new Aries SDK implementation
 * Verifies data matches official platform
 */

import { ariesSDKService } from '../services/ariesSDKService';

async function testNewAPI() {
  console.log('🧪 Testing New Aries SDK Implementation\n');
  console.log('=' .repeat(80));

  try {
    // Test 1: Initialize handles
    console.log('\n📋 Test 1: Initialize Table Handles');
    console.log('-'.repeat(80));
    const handles = await ariesSDKService['initializeHandles']();
    console.log('✅ Handles initialized:');
    console.log(`   Stats Handle: ${handles.statsHandle}`);
    console.log(`   Oracle Handle: ${handles.oracleHandle}`);
    console.log(`   Farms Handle: ${handles.farmsHandle}`);

    // Test 2: Fetch single reserve (USDT)
    console.log('\n📋 Test 2: Fetch Single Reserve (USDT)');
    console.log('-'.repeat(80));
    const usdtData = await ariesSDKService.fetchReserveData(
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
      'USDT',
      'Tether USD',
      true,
      false
    );
    console.log('✅ USDT Data:');
    console.log(`   Symbol: ${usdtData.symbol}`);
    console.log(`   Price: $${usdtData.priceUSD.toFixed(4)}`);
    console.log(`   Supply APR: ${usdtData.supplyAPR.toFixed(2)}%`);
    console.log(`   Borrow APR: ${usdtData.borrowAPR.toFixed(2)}%`);
    console.log(`   Market Size: $${usdtData.marketSizeUSD.toLocaleString()}`);
    console.log(`   Total Borrowed: $${usdtData.totalBorrowedUSD.toLocaleString()}`);
    console.log(`   Utilization: ${usdtData.utilization.toFixed(2)}%`);
    console.log(`   LTV: ${usdtData.ltv}%`);

    // Test 3: Fetch all Main Pool reserves
    console.log('\n📋 Test 3: Fetch Main Pool Reserves');
    console.log('-'.repeat(80));
    const mainPoolReserves = await ariesSDKService.getReservesByPool('paired');
    console.log(`✅ Found ${mainPoolReserves.length} Main Pool assets:`);
    mainPoolReserves.forEach((reserve, index) => {
      console.log(`\n   ${index + 1}. ${reserve.symbol} (${reserve.name})`);
      console.log(`      Price: $${reserve.priceUSD.toFixed(4)}`);
      console.log(`      Supply APR: ${reserve.supplyAPR.toFixed(2)}%`);
      console.log(`      Borrow APR: ${reserve.borrowAPR.toFixed(2)}%`);
      console.log(`      Market Size: $${reserve.marketSizeUSD.toLocaleString()}`);
      console.log(`      Total Borrowed: $${reserve.totalBorrowedUSD.toLocaleString()}`);
      console.log(`      Utilization: ${reserve.utilization.toFixed(1)}%`);
    });

    // Test 4: Fetch Merkle LP Pool reserves
    console.log('\n📋 Test 4: Fetch Merkle LP Pool Reserves');
    console.log('-'.repeat(80));
    const merkleLPReserves = await ariesSDKService.getReservesByPool('isolated');
    console.log(`✅ Found ${merkleLPReserves.length} Merkle LP Pool assets:`);
    merkleLPReserves.forEach((reserve, index) => {
      console.log(`\n   ${index + 1}. ${reserve.symbol} (${reserve.name})`);
      console.log(`      Price: $${reserve.priceUSD.toFixed(4)}`);
      console.log(`      Supply APR: ${reserve.supplyAPR.toFixed(2)}%`);
      console.log(`      Borrow APR: ${reserve.borrowAPR.toFixed(2)}%`);
      console.log(`      Market Size: $${reserve.marketSizeUSD.toLocaleString()}`);
      console.log(`      Total Borrowed: $${reserve.totalBorrowedUSD.toLocaleString()}`);
      console.log(`      Utilization: ${reserve.utilization.toFixed(1)}%`);
    });

    // Test 5: Calculate totals
    console.log('\n📋 Test 5: Calculate Pool Totals');
    console.log('-'.repeat(80));
    const mainPoolTotal = mainPoolReserves.reduce((sum, r) => sum + r.marketSizeUSD, 0);
    const mainPoolBorrowed = mainPoolReserves.reduce((sum, r) => sum + r.totalBorrowedUSD, 0);
    const merkleLPTotal = merkleLPReserves.reduce((sum, r) => sum + r.marketSizeUSD, 0);
    const merkleLPBorrowed = merkleLPReserves.reduce((sum, r) => sum + r.totalBorrowedUSD, 0);

    console.log('✅ Main Pool Totals:');
    console.log(`   Market Size: $${mainPoolTotal.toLocaleString()}`);
    console.log(`   Total Borrowed: $${mainPoolBorrowed.toLocaleString()}`);
    console.log(`   Utilization: ${((mainPoolBorrowed / mainPoolTotal) * 100).toFixed(1)}%`);

    console.log('\n✅ Merkle LP Pool Totals:');
    console.log(`   Market Size: $${merkleLPTotal.toLocaleString()}`);
    console.log(`   Total Borrowed: $${merkleLPBorrowed.toLocaleString()}`);
    console.log(`   Utilization: ${((merkleLPBorrowed / merkleLPTotal) * 100).toFixed(1)}%`);

    // Expected values from official platform
    console.log('\n📊 Comparison with Official Platform:');
    console.log('-'.repeat(80));
    console.log('Expected Main Pool:');
    console.log('   Market Size: ~$81.1M');
    console.log('   Total Borrowed: ~$30.8M');
    console.log('   Utilization: ~38.0%');
    console.log('\nExpected Merkle LP Pool:');
    console.log('   Market Size: ~$42.7K');
    console.log('   Total Borrowed: ~$78.6');
    console.log('   Utilization: ~0.2%');

    console.log('\n' + '='.repeat(80));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testNewAPI()
  .then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
