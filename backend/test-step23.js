import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User, Conversation, Message, Job, Notification } from './src/models/index.js';
import {
  SUPPORTED_LANGUAGES,
  translationInputSchema,
  translateText,
  translateJobDescription,
  translateChatMessage,
  translateNotificationText,
} from './src/services/ai/translationService.js';

async function runStep23Tests() {
  console.log('==================================================');
  console.log('--- STARTING STEP 23 VERIFICATION TESTS (AI TRANSLATION) ---');
  console.log('==================================================');
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const createdUserIds = [];
  const createdConvIds = [];
  const createdMsgIds = [];
  const createdJobIds = [];
  const createdNotifIds = [];

  try {
    // ----------------------------------------------------
    // Test 1: English content translates to Marathi
    // ----------------------------------------------------
    console.log('\n--- 1. Testing English to Marathi Translation ---');
    const enToMrRes = await translateText({
      text: 'We need an electrician for eight days in Pune. Daily rate ₹900.',
      sourceLanguage: 'en',
      targetLanguage: 'mr',
      contentType: 'job_description',
    });

    assert(enToMrRes.sourceLanguage === 'en', 'Source language matches en');
    assert(enToMrRes.targetLanguage === 'mr', 'Target language matches mr');
    assert(typeof enToMrRes.translatedText === 'string' && enToMrRes.translatedText.length > 5, 'English successfully translated to Marathi string');
    assert(enToMrRes.translatedText.includes('₹900') || enToMrRes.translatedText.includes('900'), 'Currency rate ₹900 preserved accurately in Marathi');

    // ----------------------------------------------------
    // Test 2: English content translates to Hindi
    // ----------------------------------------------------
    console.log('\n--- 2. Testing English to Hindi Translation ---');
    const enToHiRes = await translateText({
      text: 'Can you start work tomorrow at 9 AM? Daily pay is ₹1,000.',
      sourceLanguage: 'en',
      targetLanguage: 'hi',
      contentType: 'message',
    });

    assert(enToHiRes.targetLanguage === 'hi', 'Target language matches hi');
    assert(typeof enToHiRes.translatedText === 'string' && enToHiRes.translatedText.length > 5, 'English successfully translated to Hindi string');
    assert(enToHiRes.translatedText.includes('1,000') || enToHiRes.translatedText.includes('1000') || enToHiRes.translatedText.includes('₹'), 'Wage amount and currency symbol preserved in Hindi');

    // ----------------------------------------------------
    // Test 3: Marathi/Hindi messages can be translated to English
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Marathi/Hindi to English Translation ---');
    const mrToEnRes = await translateText({
      text: 'मी उद्या सकाळी ८ वाजता कामावर पोहोचेल. काम पूर्ण होईल.',
      sourceLanguage: 'mr',
      targetLanguage: 'en',
      contentType: 'message',
    });

    assert(mrToEnRes.targetLanguage === 'en', 'Target language matches en');
    assert(typeof mrToEnRes.translatedText === 'string' && mrToEnRes.translatedText.length > 0, 'Marathi successfully translated to English');

    // ----------------------------------------------------
    // Test 4: Translation Cache Returns Fast Match
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Translation Cache ---');
    const cachedRes = await translateText({
      text: 'We need an electrician for eight days in Pune. Daily rate ₹900.',
      sourceLanguage: 'en',
      targetLanguage: 'mr',
      contentType: 'job_description',
    });
    assert(cachedRes.isCached === true, 'Subsequent identical translation query is resolved from cache');
    assert(cachedRes.translatedText === enToMrRes.translatedText, 'Cached translated text matches prior generation');

    // ----------------------------------------------------
    // Test 5: Unsupported Target Language Is Rejected
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Language Validation & Restrictions ---');
    let unsupportedCaught = false;
    try {
      await translateText({
        text: 'Hello, world!',
        targetLanguage: 'fr', // French is not allowed (only en, mr, hi)
      });
    } catch (err) {
      unsupportedCaught = true;
    }
    assert(unsupportedCaught, 'Unsupported target language "fr" is rejected with validation error');

    // ----------------------------------------------------
    // Test 6: Long Text Safely Rejected / Limited
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Length Constraints ---');
    let longTextCaught = false;
    try {
      const hugeText = 'A'.repeat(3500); // Exceeds 3000 limit
      await translateText({
        text: hugeText,
        targetLanguage: 'mr',
      });
    } catch (err) {
      longTextCaught = true;
    }
    assert(longTextCaught, 'Excessively long text (>3000 chars) is safely rejected by Zod schema');

    // ----------------------------------------------------
    // Test 7: Seed Database for Private Message Translation
    // ----------------------------------------------------
    console.log('\n--- 7. Chat Message & Job Description Translation ---');
    const userSender = await User.create({
      name: 'Chat Sender',
      email: `sender_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    createdUserIds.push(userSender._id);

    const userReceiver = await User.create({
      name: 'Chat Receiver',
      email: `receiver_${Date.now()}@kaamsetu.test`,
      role: 'employer',
      status: 'active',
    });
    createdUserIds.push(userReceiver._id);

    const userThirdParty = await User.create({
      name: 'Third Party Intruder',
      email: `intruder_${Date.now()}@kaamsetu.test`,
      role: 'employer',
      status: 'active',
    });
    createdUserIds.push(userThirdParty._id);

    const conv = await Conversation.create({
      participants: [userSender._id, userReceiver._id],
    });
    createdConvIds.push(conv._id);

    const originalMsgContent = 'Please confirm the site address and agreed daily wage of ₹950.';
    const chatMsg = await Message.create({
      conversationId: conv._id,
      senderId: userSender._id,
      receiverId: userReceiver._id,
      content: originalMsgContent,
    });
    createdMsgIds.push(chatMsg._id);

    // Test authorized participant translation
    const transMsgRes = await translateChatMessage(chatMsg._id, 'mr', userReceiver._id);
    assert(transMsgRes.isTranslated === true, 'Authorized participant can translate chat message');
    assert(typeof transMsgRes.translatedContent === 'string', 'Message translated into Marathi');
    assert(transMsgRes.originalContent === originalMsgContent, 'Original message content returned intact');

    // Verify in database that original message was NOT replaced or lost
    const reloadedMsg = await Message.findById(chatMsg._id);
    assert(reloadedMsg.content === originalMsgContent, 'Original message in database remains strictly unmodified');
    assert(reloadedMsg.translations.get('mr') === transMsgRes.translatedContent, 'Translated text stored in message translations map');

    // ----------------------------------------------------
    // Test 8: Private Message Access Restriction
    // ----------------------------------------------------
    console.log('\n--- 8. Security & Privacy Access Control ---');
    let unauthorizedCaught = false;
    try {
      await translateChatMessage(chatMsg._id, 'hi', userThirdParty._id);
    } catch (authErr) {
      if (authErr.status === 403) {
        unauthorizedCaught = true;
      }
    }
    assert(unauthorizedCaught, 'Third-party user outside conversation cannot translate private message (403 Forbidden)');

    // ----------------------------------------------------
    // Test 9: Job Description Translation
    // ----------------------------------------------------
    console.log('\n--- 9. Job Description Translation & Persistence ---');
    const jobRecord = await Job.create({
      employerId: userReceiver._id,
      title: 'Plumbing Pipeline Repair',
      description: 'Urgent plumbing assistance needed for industrial pipe leaking. Rate: ₹1200 per day.',
      skillRequired: 'plumber',
      workersRequired: 1,
      wageType: 'daily',
      wageAmount: 1200,
      durationType: 'single_day',
      startDate: new Date(),
      location: { city: 'Pune' },
      status: 'open',
    });
    createdJobIds.push(jobRecord._id);

    const jobTransRes = await translateJobDescription(jobRecord._id, 'mr');
    assert(jobTransRes.isTranslated === true, 'Job description successfully translated');
    assert(jobTransRes.originalDescription === jobRecord.description, 'Original job description unchanged');

    const reloadedJob = await Job.findById(jobRecord._id);
    assert(reloadedJob.description === jobRecord.description, 'Canonical job record description strictly preserved');
    assert(reloadedJob.translations.get('mr') === jobTransRes.translatedDescription, 'Translated description cached in job document');

    // ----------------------------------------------------
    // Test 10: Notification Translation
    // ----------------------------------------------------
    console.log('\n--- 10. Notification Translation ---');
    const notif = await Notification.create({
      userId: userSender._id,
      type: 'JOB_INVITATION',
      title: 'New Job Invitation',
      message: 'You have been invited to apply for Electrical Wiring job with ₹1000 wage.',
    });
    createdNotifIds.push(notif._id);

    const notifTransRes = await translateNotificationText(notif._id, 'mr', userSender._id);
    assert(notifTransRes.isTranslated === true, 'Notification message translated for recipient');
    assert(notifTransRes.originalMessage === notif.message, 'Canonical notification message unchanged');

    let notifUnauthorizedCaught = false;
    try {
      await translateNotificationText(notif._id, 'mr', userReceiver._id); // Not the recipient
    } catch (err) {
      if (err.status === 403) notifUnauthorizedCaught = true;
    }
    assert(notifUnauthorizedCaught, 'Non-recipient cannot translate another user’s notification (403 Forbidden)');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    console.log('\nCleaning up test records...');
    try {
      if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
      if (createdConvIds.length > 0) await Conversation.deleteMany({ _id: { $in: createdConvIds } });
      if (createdMsgIds.length > 0) await Message.deleteMany({ _id: { $in: createdMsgIds } });
      if (createdJobIds.length > 0) await Job.deleteMany({ _id: { $in: createdJobIds } });
      if (createdNotifIds.length > 0) await Notification.deleteMany({ _id: { $in: createdNotifIds } });
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`STEP 23 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep23Tests();
