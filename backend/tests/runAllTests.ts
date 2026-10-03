import { testGstCalculations } from './gstCalculations.test.js';
import { testKhataCalculations } from './khataCalculations.test.js';
import { testAuthAndSecurity } from './authAndIsolation.test.js';
import { testPaymentAbstraction } from './payments.test.js';
import { testBusinessModule } from './business.test.js';
import { runCustomerKhataTests } from './customerKhata.test.js';
import { runProductStockTests } from './productStock.test.js';
import { runInvoiceGstEngineTests } from './invoiceGstEngine.test.js';
import { runDigitalStoreAndCardTests } from './digitalStoreAndCard.test.js';
import { runDailyContentAndCmsTests } from './dailyContentAndCms.test.js';
import { runAiIntegrationTests } from './aiIntegration.test.js';
import { runSubscriptionPaymentTests } from './subscriptionPayment.test.js';
import { runFirebaseAuthTests } from './firebaseAuth.test.js';
import { runAdminTests } from './admin.test.js';
import { runReferralWalletTests } from './referralWallet.test.js';
import { runSecurityGradingTests } from './securityGrading.test.js';
import { runKhataSharingTests } from './khataSharing.test.js';

async function runAll() {
  console.log('========================================================');
  console.log('🧪 BRANDX BACKEND TEST SUITE EXECUTION');
  console.log('========================================================');

  try {
    testGstCalculations();
    testKhataCalculations();
    await runKhataSharingTests();
    await testAuthAndSecurity();
    await runFirebaseAuthTests();
    await testBusinessModule();
    await runCustomerKhataTests();
    await runProductStockTests();
    await runInvoiceGstEngineTests();
    await runDigitalStoreAndCardTests();
    await runDailyContentAndCmsTests();
    await runAiIntegrationTests();
    await testPaymentAbstraction();
    await runSubscriptionPaymentTests();
    await runAdminTests();
    await runReferralWalletTests();
    await runSecurityGradingTests();

    console.log('\n========================================================');
    console.log('🎉 ALL BACKEND UNIT, LOGIC & SECURITY TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  }
}

runAll();
