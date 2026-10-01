/**
 * BRANDX — Centralized Production Legal & Privacy Documents Store
 * Versioned, production-ready legal documentation for BrandX Super App.
 * Tailored for Indian Retailers, Shopkeepers, and MSMEs.
 * Governed by the Laws of the Republic of India.
 */

export interface LegalDocumentSection {
  heading: string;
  body: string | string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  titleHindi?: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  summaryHindi?: string;
  sections: LegalDocumentSection[];
  contactEmail: string;
}

export const LEGAL_DISCLAIMER_NOTICE = 
  "These documents describe the general terms and policies for using BrandX. They are not legal, tax, accounting or professional advice. For advice specific to your circumstances, consult a qualified professional.";

export const LEGAL_DISCLAIMER_NOTICE_HINDI = 
  "ये दस्तावेज़ BrandX के उपयोग के सामान्य नियमों और नीतियों का विवरण प्रदान करते हैं। ये कानूनी, कर, लेखांकन या पेशेवर सलाह नहीं हैं। अपनी विशिष्ट परिस्थितियों के लिए किसी योग्य पेशेवर से परामर्श लें।";

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    titleHindi: 'सेवा की शर्तें (Terms of Service)',
    version: '1.2.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'The comprehensive terms governing your access to and use of the BrandX SaaS software and services.',
    summaryHindi: 'BrandX SaaS सॉफ़्टवेयर और सेवाओं तक आपकी पहुँच और उपयोग को नियंत्रित करने वाली व्यापक शर्तें।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. Introduction',
        body: [
          'Welcome to BrandX. BrandX is a digital software and productivity platform provided by BRANDX Technologies India ("BrandX", "we", "us", or "our").',
          'These Terms of Service ("Terms") govern your access to and use of the BrandX web application, mobile applications, APIs, and associated business tools (collectively, the "Service").',
          'By registering for an account, accessing, or using the Service, you ("User", "Merchant", "you") confirm that you have read, understood, and agreed to be bound by these Terms.',
          'BrandX provides digital utility and productivity software. BrandX is NOT a law firm, chartered accountancy firm, tax consultancy, or financial institution. We do not provide legal, tax, GST, accounting, or financial advice.',
        ],
      },
      {
        heading: '2. Eligibility',
        body: [
          'You must be at least 18 years of age or the age of legal majority in your state/jurisdiction to register for an account and use the Service.',
          'If you are using the Service on behalf of a sole proprietorship, partnership firm, company, LLP, or other business entity, you represent and warrant that you have full legal authority to bind that entity to these Terms.',
        ],
      },
      {
        heading: '3. Account Creation & Authentication',
        body: [
          'To access BrandX features, you must create an account by providing a valid mobile phone number and accurate business details.',
          'Authentication is conducted via secure one-time password (OTP) or verified credentials. You agree to provide true, accurate, and current information during registration and to keep this information updated.',
          'You are strictly responsible for maintaining the confidentiality of your login credentials and OTPs. You must not share your OTPs or passwords with anyone.',
        ],
      },
      {
        heading: '4. User Responsibilities',
        body: [
          'You are entirely responsible for all activities, entries, transactions, and communications conducted under your authenticated account.',
          'If you permit staff, shop assistants, or family members to access BrandX on your devices, you remain solely responsible for their actions and entries.',
          'You agree to notify BrandX immediately at support@brandx.in if you suspect any unauthorized access, loss of your device, or credential compromise.',
        ],
      },
      {
        heading: '5. Business Information Responsibility',
        body: [
          'You are solely responsible for the correctness and completeness of all business profile information you enter into BrandX, including your shop/firm name, owner name, business address, state, PIN code, PAN, GSTIN, and bank/UPI details.',
          'BrandX does not independently verify the ownership or validity of your tax registration or trade licenses.',
        ],
      },
      {
        heading: '6. GST & Invoice Responsibility',
        body: [
          'BrandX provides software tools that calculate figures based strictly on the parameters, tax rates, and prices you enter.',
          'You acknowledge and agree that BrandX is NOT a tax advisor or accounting firm. You are solely responsible for determining the applicability of GST, choosing correct HSN/SAC codes, applying accurate tax rates (CGST, SGST, IGST, CESS), and ensuring the legality and format of invoices issued to your buyers.',
          'You remain exclusively responsible for the timely calculation, filing, and payment of all statutory GST returns (including GSTR-1 and GSTR-3B) with the Goods and Services Tax Network (GSTN) and the Government of India.',
        ],
      },
      {
        heading: '7. Customer & Khata Data Responsibility',
        body: [
          'BrandX provides a digital ledger ("Khata") tool to help you record credit (Udhar) and payment (Jama) transactions with your customers and suppliers.',
          'You are solely responsible for the accuracy of all ledger entries, transaction dates, customer names, contact numbers, and outstanding amounts recorded in your Khata.',
          'You warrant that you have obtained appropriate consent from your customers before recording their contact information and ledger balances. Any payment disputes or settlement disagreements between you and your customers are strictly between you and them.',
        ],
      },
      {
        heading: '8. Product & Catalog Responsibility',
        body: [
          'You are solely responsible for all product information, item descriptions, prices, discounts, stock availability, and images uploaded to your store catalog.',
          'You represent that you have the legal right to sell all items listed in your catalog and that they comply with applicable consumer protection and product safety laws.',
        ],
      },
      {
        heading: '9. Digital Dukaan Responsibility',
        body: [
          'BrandX provides a Digital Dukaan storefront tool allowing you to showcase products and receive inquiries or orders from buyers.',
          'You are strictly responsible for fulfilling all customer orders, quality of goods delivered, packaging, dispatch, pricing, warranties, returns, and customer satisfaction.',
          'BrandX is not a party to transactions conducted between you and your retail buyers and bears no liability for buyer non-payment or merchant non-delivery.',
        ],
      },
      {
        heading: '10. AI-Generated Content Responsibility',
        body: [
          'BrandX provides AI-assisted features (such as the Biz AI Copilot, marketing caption generator, and review reply drafts).',
          'AI outputs are generated by automated algorithms and may occasionally be inaccurate, incomplete, or unsuitable for your specific context.',
          'You MUST review and verify all AI-generated text, marketing copy, and offers before publishing, sending, or printing them. AI outputs do not constitute legal, tax, accounting, or professional advice. You remain solely responsible for the final content and any actions taken based on AI output.',
        ],
      },
      {
        heading: '11. WhatsApp & Sharing Responsibility',
        body: [
          'BrandX enables you to share bills, receipts, payment reminders, and promotional posters with your contacts via third-party messaging channels such as WhatsApp.',
          'You initiate and control all sharing actions. You are solely responsible for verifying the recipient\'s phone number, ensuring the recipient has consented to receive messages from you, and complying with all applicable anti-spam and messaging guidelines.',
        ],
      },
      {
        heading: '12. Pro Subscription',
        body: [
          'BrandX offers optional paid Pro subscription tiers that provide expanded features, including unlimited GST billing, POS features, HD marketing posters, and expanded AI limits.',
          'Pro features and quotas are described in the Subscription section of the app and may be updated from time to time with advance notice where feasible.',
        ],
      },
      {
        heading: '13. Billing & Payments',
        body: [
          'Current pricing for BrandX Pro is ₹349 per month for monthly subscriptions and ₹2,999 per year for annual subscriptions (inclusive of applicable taxes).',
          'Payments are processed via authorized third-party payment gateways. By subscribing, you agree to the payment provider\'s terms and authorize billing of the applicable subscription fee.',
          'Subscription auto-renewals, cancellations, and refund rights are governed by our Subscription, Billing & Refund Policy.',
        ],
      },
      {
        heading: '14. Acceptable Use',
        body: [
          'You agree to use BrandX strictly for lawful business purposes in accordance with our Acceptable Use Policy.',
          'You must not use the platform for fraud, deceptive invoicing, tax evasion, sale of banned goods, harassment, system abuse, or unauthorized access attempts.',
        ],
      },
      {
        heading: '15. Intellectual Property',
        body: [
          'BrandX and its licensors own all rights, title, and interest in the Service, software code, user interface designs, logos, graphic templates, and documentation.',
          'You retain full ownership of your business logos, trademarks, store photographs, custom product descriptions, and customer records uploaded to BrandX.',
          'When you create a marketing poster or bill using BrandX templates, you own the resulting business document and may freely publish, distribute, or print it.',
        ],
      },
      {
        heading: '16. Third-Party Services',
        body: [
          'The Service integrates with or relies upon third-party infrastructure and providers (including cloud hosting, payment gateways, SMS authentication, and generative AI APIs).',
          'BrandX is not responsible for interruptions, delays, or service failures caused by third-party service providers or telecommunications networks.',
        ],
      },
      {
        heading: '17. Service Availability',
        body: [
          'BrandX is provided on an "AS IS" and "AS AVAILABLE" basis. While we strive for continuous availability and offer offline PWA capabilities for essential features, we do not warrant that the Service will be uninterrupted, error-free, or completely immune to network downtime.',
          'We reserve the right to perform scheduled maintenance, security upgrades, or feature enhancements.',
        ],
      },
      {
        heading: '18. Account Suspension & Termination',
        body: [
          'BrandX reserves the right to suspend, restrict, or terminate your access to the Service immediately if we determine that you have violated these Terms, engaged in fraudulent or illegal activity, failed to pay applicable fees, or compromised the security of the platform.',
        ],
      },
      {
        heading: '19. Account Deletion',
        body: [
          'You may request deletion of your account at any time through the Account & Data Control section in App Settings or by emailing support@brandx.in.',
          'Account deletion is irreversible. Because merchants are required by Indian GST regulations to maintain tax records for statutory periods, merchants are advised to download all required invoices and ledgers prior to deletion.',
        ],
      },
      {
        heading: '20. Data Handling & Privacy Policy Reference',
        body: [
          'Your privacy and data security are important to us. All personal and business data processed through the Service is governed by our Privacy Policy.',
          'By agreeing to these Terms, you also acknowledge and accept our Privacy Policy.',
        ],
      },
      {
        heading: '21. Limitation of Liability',
        body: [
          'To the maximum extent permitted under applicable Indian law, BrandX, its founders, directors, employees, and agents shall not be liable for any indirect, incidental, special, punitive, or consequential damages, including loss of business profits, revenue, data, or goodwill.',
          'Our total cumulative liability for any claim arising out of or related to these Terms or the Service shall not exceed the total subscription fees actually paid by you to BrandX in the twelve (12) months preceding the event giving rise to the claim (or ₹1,000 if using the Free tier).',
        ],
      },
      {
        heading: '22. Disclaimer',
        body: [
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
          'BRANDX DOES NOT PROVIDE LEGAL, TAX, GST, ACCOUNTING, OR FINANCIAL ADVICE. FOR ADVICE REGARDING YOUR SPECIFIC BUSINESS, TAX OBLIGATIONS, OR LEGAL COMPLIANCE, YOU MUST CONSULT A QUALIFIED PROFESSIONAL.',
        ],
      },
      {
        heading: '23. Changes to Terms',
        body: [
          'We may update or revise these Terms from time to time. When changes are made, we will update the "Last Updated" date at the top of this document.',
          'Your continued access or use of the Service following any update constitutes your acceptance of the revised Terms. If you do not agree to the changes, you must discontinue using the Service.',
        ],
      },
      {
        heading: '24. Governing Law & Jurisdiction',
        body: [
          'These Terms and any dispute or claim arising out of or relating to them shall be governed by and construed in accordance with the laws of the Republic of India.',
          'The competent courts located in New Delhi, India shall have exclusive jurisdiction over all disputes arising out of or relating to these Terms or the Service.',
        ],
      },
      {
        heading: '25. Contact Information',
        body: [
          'For any questions, legal notices, or inquiries regarding these Terms of Service, please contact our support desk at:',
          'BRANDX Technologies India',
          'Email: support@brandx.in',
          'New Delhi, Republic of India',
        ],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    titleHindi: 'गोपनीयता नीति (Privacy Policy)',
    version: '1.2.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'Clear, transparent explanation of what information BrandX processes, why it is used, how it is safeguarded, and your rights.',
    summaryHindi: 'BrandX द्वारा प्रोसेस की जाने वाली जानकारी, इसके उपयोग के कारणों, सुरक्षा और आपके अधिकारों का पारदर्शी विवरण।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. Introduction',
        body: [
          'BRANDX Technologies India ("BrandX", "we", "our") respects the privacy of our merchants, their customers, and our platform visitors.',
          'This Privacy Policy describes in clear, simple language what information may be processed by BrandX, why we process it, how we safeguard it, and your rights under Indian privacy regulations, including the Digital Personal Data Protection Act (DPDPA), 2023.',
        ],
      },
      {
        heading: '2. Information That May Be Processed',
        body: [
          'To provide the BrandX service, we may process the following categories of information entered or generated during your use of the platform:',
          '• Personal & Account Details: Full name, mobile phone number, email address, profile picture, and login credentials.',
          '• Business Profile Information: Shop/firm name, business category, business address, city, state, PIN code, GSTIN, PAN, UPI VPA (ID), and shop logo.',
          '• Invoices & POS Billing Data: Recipient customer names, customer phone numbers, itemized goods or services, quantities, prices, tax calculations, invoice numbers, dates, and payment status entered by you.',
          '• Customer & Khata Ledger Data: Customer names, phone numbers, credit (Udhar) and debit (Jama) records, payment dates, and transaction notes entered by the merchant.',
          '• Products & Digital Catalog: Product names, SKUs, inventory counts, selling prices, product descriptions, and uploaded product images.',
          '• Uploaded Files & Content: Custom logos, promotional banner photographs, and visiting card assets uploaded to the editor.',
          '• Subscription Information: Pro plan tier, activation dates, renewal dates, and payment gateway transaction references.',
          '• Technical & Session Information: Client IP address, device type, operating system, browser user-agent, app build version, and authentication session timestamps.',
          '• Support Communications: Correspondence, bug reports, and inquiries voluntarily submitted to our support desk.',
        ],
      },
      {
        heading: '3. Why Information Is Processed',
        body: [
          'We process your information strictly for legitimate operational purposes:',
          '• Account Authentication: To verify your identity, send login OTPs, and maintain secure access to your account.',
          '• Providing Requested Features: To operate the invoicing system, Khata ledger, Digital Dukaan, poster editor, and standee generator.',
          '• Storing Business Data: To safely store and sync your business records across your authorized sessions and devices.',
          '• Generating Invoices & Content: To format and calculate GST invoices, quotations, delivery receipts, and marketing templates requested by you.',
          '• AI Functionality: To process marketing prompts, business queries, and voice requests through our AI Copilot.',
          '• Subscription Management: To manage Pro entitlements, track validity periods, and confirm subscription status.',
          '• Security & Protection: To maintain system integrity, detect fraud, monitor unauthorized access, and protect merchant accounts.',
          '• Customer Support: To investigate technical issues, assist with queries, and resolve bug reports.',
          '• Legal & Statutory Compliance: To comply with applicable laws, tax regulations, and lawful government requests in India.',
        ],
      },
      {
        heading: '4. Data Retention',
        body: [
          'We retain your business and account data for as long as your account remains active and as necessary to provide the Service.',
          'Under Indian tax regulations (such as Section 36 of the Central Goods and Services Tax Act, 2017), registered businesses are required to maintain accounting and tax invoice records for statutory periods (typically up to seventy-two (72) months from the due date of furnishing the annual return).',
          'Because BrandX is a digital record-keeping tool, we retain your invoice and ledger records while your account is open to support your tax compliance. We strongly advise merchants to export their records before requesting account deletion.',
        ],
      },
      {
        heading: '5. Deletion & Account Closure',
        body: [
          'You have the right to request deletion of your BrandX account at any time through the Account & Data Control section in App Settings or by contacting support@brandx.in.',
          'Upon account deletion, your login identity is revoked, your business profile is removed from active service, and local caches on your device are cleared.',
          'Please note that account deletion is permanent and cannot be reversed.',
        ],
      },
      {
        heading: '6. Third-Party Service Providers',
        body: [
          'BrandX DOES NOT sell or rent your personal, business, or customer records to third-party data brokers or advertisers.',
          'To provide a reliable cloud service, information may be processed by trusted third-party service providers solely where technically necessary:',
          '• SMS & Authentication: Third-party SMS gateways and authentication services for delivering verification OTPs.',
          '• Cloud Database & Hosting: Managed secure cloud hosting and database infrastructure with transit encryption.',
          '• Artificial Intelligence: Configured enterprise AI language model providers to generate text, captions, and business assistance when you interact with AI features.',
          '• Payment Gateways: Authorized Indian payment gateway partners for processing Pro subscriptions. BrandX does not store credit/debit card numbers, CVVs, or net banking passwords on our servers.',
        ],
      },
      {
        heading: '7. Your Rights & Grievance Contact',
        body: [
          'Under applicable Indian privacy standards, you have the right to review your data in App Settings, correct any inaccurate business details, and request account deletion.',
          'For any privacy questions, grievances, or data inquiries, please contact our Grievance Desk at:',
          'Grievance Desk, BRANDX Technologies India',
          'Email: support@brandx.in (Subject: "ATTN: Privacy Grievance")',
        ],
      },
    ],
  },

  'ai-terms': {
    id: 'ai-terms',
    title: 'AI Usage Terms & Data Notice',
    titleHindi: 'AI उपयोग की शर्तें व डेटा नोटिस',
    version: '1.1.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'Guidelines, safety rules, and data processing disclosures for BrandX AI Copilot and generative AI features.',
    summaryHindi: 'BrandX AI कोपायलट और जेनेरेटिव AI सुविधाओं के लिए दिशानिर्देश, सुरक्षा नियम और डेटा प्रकटीकरण।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. AI-Powered Features in BrandX',
        body: [
          'BrandX includes AI-assisted features designed to help Indian merchants with everyday business tasks, including:',
          '• Business assistance and operational suggestions;',
          '• Marketing captions and social media post ideas;',
          '• Promotional poster headline and copy generation;',
          '• Customer review reply drafts;',
          '• WhatsApp promotional campaign drafts;',
          '• Voice-assisted invoice item entry assistance;',
          '• General business insights and idea exploration.',
        ],
      },
      {
        heading: '2. Accuracy & Verification Requirement',
        body: [
          'Generative AI models are automated systems that produce responses based on language patterns. They may occasionally generate inaccurate, incomplete, hallucinated, or outdated information.',
          'You MUST carefully review, verify, and validate all AI-generated text, product descriptions, pricing offers, discount percentages, and customer messages before posting them, sending them to customers, or printing them.',
          'You remain solely responsible for any content published, shared, or printed using BrandX tools.',
        ],
      },
      {
        heading: '3. Sensitive Data Advisory',
        body: [
          'To protect your business and customers, you must observe the following prompt safety rules:',
          '• NEVER type passwords, PINs, OTPs, net-banking credentials, or debit/credit card numbers into AI prompt fields.',
          '• NEVER input confidential customer financial details, Aadhaar numbers, or sensitive personal information into AI queries.',
          '• Limit prompt inputs to business context, product descriptions, marketing topics, and customer communication instructions.',
        ],
      },
      {
        heading: '4. No Professional Advice',
        body: [
          'AI-generated outputs do NOT constitute legal, tax, accounting, financial, or professional advice.',
          'BrandX makes no warranty regarding the legal compliance, tax accuracy, or commercial outcome of using AI-generated marketing copy or business suggestions.',
          'For matters involving tax compliance, legal contracts, or financial planning, always consult a qualified professional.',
        ],
      },
      {
        heading: '5. AI Data Processing Disclosure',
        body: [
          'When you interact with AI features in BrandX, the prompt text, requested business category, and contextual inputs you submit are transmitted securely over HTTPS to our configured cloud AI language model providers.',
          'Transmission is strictly for the purpose of generating the requested output for your session.',
          'BrandX does not transmit your master database passwords, banking PINs, or raw customer Khata ledgers to the AI provider.',
        ],
      },
      {
        heading: '6. Fair Usage & Rate Limits',
        body: [
          'To ensure reliable performance for all merchants, AI requests are subject to daily fair-usage rate limits based on your plan tier (Free or Pro).',
          'Automated script-driven prompt flooding, scraping, or abusive queries are strictly prohibited.',
        ],
      },
      {
        heading: '7. Contact & Feedback',
        body: [
          'If you observe unexpected, offensive, or inaccurate behavior from AI tools, please notify our support team at support@brandx.in.',
        ],
      },
    ],
  },

  'acceptable-use': {
    id: 'acceptable-use',
    title: 'Acceptable Use Policy',
    titleHindi: 'स्वीकार्य उपयोग नीति (AUP)',
    version: '1.1.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'Clear standards and restrictions regarding permitted and prohibited activities on the BrandX platform.',
    summaryHindi: 'BrandX प्लेटफ़ॉर्म पर अनुमत और प्रतिबंधित गतिविधियों से संबंधित स्पष्ट मानक और प्रतिबंध।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. Purpose & Scope',
        body: [
          'This Acceptable Use Policy ("AUP") defines permitted and prohibited uses of the BrandX software, APIs, store features, and integrations.',
          'All registered merchants, business owners, and authorized users must comply with this policy at all times.',
        ],
      },
      {
        heading: '2. Prohibited Business Activities & Content',
        body: [
          'You agree that you will NOT use BrandX to market, sell, invoice, or facilitate any of the following:',
          '• Fraud & Scams: Any fraudulent, deceptive, or misleading business activity, financial scams, or ponzi/pyramid schemes.',
          '• Impersonation: Impersonating another person, business, firm, or government agency.',
          '• Deceptive Invoicing: Creating forged, false, or misleading tax invoices for transactions that did not occur, or to evade tax obligations.',
          '• Unlawful Business Activity: Any business activity prohibited under the laws of the Republic of India or the state where you operate.',
          '• Banned Goods & Substances: Illegal narcotics, prescription medicines sold without valid statutory drug licenses, or banned chemical substances.',
          '• Weapons & Fireworks: Illegal firearms, ammunition, weapons, or uncertified hazardous explosives.',
          '• Copyright & IP Infringement: Selling counterfeit goods, unauthorized replicas, or distributing copyrighted materials without license.',
          '• Harmful & Illegal Content: Defamatory, obscene, abusive, harassing, or sexually explicit content.',
        ],
      },
      {
        heading: '3. Technical & System Restrictions',
        body: [
          'You agree that you will NOT:',
          '• Upload, transmit, or introduce viruses, malware, trojans, or malicious code into the platform or uploaded image assets.',
          '• Attempt unauthorized access to, probe, scan, or test the vulnerability of BrandX servers, networks, or other merchant accounts.',
          '• Attempt to bypass backend authorization, multi-tenant isolation, or subscription paywalls.',
          '• Use automated bots, scrapers, crawlers, or rate-limit exhaustion scripts against BrandX APIs.',
          '• Collect, scrape, or harvest personal information of other users or third parties without authorization.',
          '• Use BrandX integrated messaging tools to send unsolicited spam, bulk marketing messages, or communications in violation of telecom regulations.',
        ],
      },
      {
        heading: '4. Enforcement & Account Suspension',
        body: [
          'BrandX actively monitors system activity to detect abusive, fraudulent, or harmful behavior.',
          'If we determine that an account has violated this Acceptable Use Policy, BrandX reserves the right to issue a warning, restrict specific features, or immediately suspend or permanently terminate the account without refund.',
          'Where required by applicable Indian law, BrandX will cooperate fully with lawful law enforcement authorities.',
        ],
      },
      {
        heading: '5. Reporting Violations',
        body: [
          'To report any suspected violation of this policy or abusive use of BrandX, please email our security desk at support@brandx.in.',
        ],
      },
    ],
  },

  'billing-terms': {
    id: 'billing-terms',
    title: 'Subscription, Billing & Refund Policy',
    titleHindi: 'सब्सक्रिप्शन, बिलिंग व रिफंड नीति',
    version: '1.2.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'Official pricing plans, billing cycles, renewals, cancellations, and refund policy terms.',
    summaryHindi: 'आधिकारिक मूल्य निर्धारण, बिलिंग चक्र, नवीनीकरण, रद्दीकरण और रिफंड नीति की शर्तें।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. Subscription Plans & Pricing',
        body: [
          'BrandX provides both free and upgraded paid subscription options:',
          '• Free Plan: Essential digital khata, basic digital business card, and standard daily billing and AI allowances.',
          '• Pro Monthly: ₹349 per month (inclusive of applicable taxes). Includes unlimited GST invoices, full POS billing, unlimited HD marketing posters, WhatsApp reminder templates, and expanded AI limits.',
          '• Pro Yearly: ₹2,999 per year (inclusive of applicable taxes). Offers maximum savings, annual Pro benefits, and smart tabletop QR standee features.',
          'All fees are stated in Indian Rupees (INR).',
        ],
      },
      {
        heading: '2. Subscription Activation & Billing',
        body: [
          'When you purchase a BrandX Pro subscription, your Pro entitlements are activated immediately upon successful payment authorization.',
          'Billing cycles commence on the date of activation and recur monthly or yearly depending on your chosen plan.',
          'Payments are processed securely through authorized payment gateway channels (such as Razorpay, UPI Autopay, or Google Play In-App Billing).',
        ],
      },
      {
        heading: '3. Renewal & Cancellation',
        body: [
          'Subscriptions with recurring billing or UPI Autopay mandates renew automatically at the end of each billing period unless cancelled prior to the renewal date.',
          'You may cancel auto-renewal at any time through the Subscription section in App Settings or directly within your UPI app mandate management screen.',
          'Cancellation stops future charges. Following cancellation, your Pro privileges remain active until the end of your current paid billing cycle.',
        ],
      },
      {
        heading: '4. Failed Payments & Subscription Suspension',
        body: [
          'If a scheduled renewal payment cannot be completed due to insufficient funds, an expired card, or a revoked mandate, your Pro subscription may be suspended until payment is settled.',
          'During any suspension, your historical invoices and Khata data remain safely preserved and accessible under standard Free tier limits.',
        ],
      },
      {
        heading: '5. Refund Policy & Payment Provider Terms',
        body: [
          'Because BrandX delivers immediate digital access to software tools, templates, and AI generation, subscription fees are generally non-refundable once activated and utilized.',
          'Where the payment/refund system is not yet live or in transition, all refund inquiries are subject to the policies of the relevant authorized payment provider and the final published BrandX refund policy.',
          'Exceptions will be reviewed on a case-by-case basis under the following conditions:',
          '• Confirmed Duplicate Billing: Where technical gateway issues resulted in multiple charges for the same subscription period;',
          '• Technical Inaccessibility: Where a verified platform defect prevented you from accessing core paid features for more than forty-eight (48) consecutive hours and our support team was unable to resolve the issue.',
          'To submit a refund request, email support@brandx.in with your registered phone number, transaction ID, and details of the issue.',
        ],
      },
      {
        heading: '6. Subscription Termination',
        body: [
          'BrandX reserves the right to terminate a subscription if the account is found to be in material breach of our Terms of Service or Acceptable Use Policy.',
          'For billing questions, please contact our accounts desk at support@brandx.in.',
        ],
      },
    ],
  },

  'security-privacy': {
    id: 'security-privacy',
    title: 'Security & Privacy Guidance',
    titleHindi: 'सुरक्षा और गोपनीयता दिशानिर्देश',
    version: '1.1.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'Best practice security rules for merchants and high-level safeguards protecting your business data.',
    summaryHindi: 'व्यापारियों के लिए सर्वोत्तम सुरक्षा नियम और आपके डेटा की सुरक्षा के उच्च-स्तरीय उपाय।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. What You Should Do (Merchant Security Best Practices)',
        body: [
          'Keeping your business data safe requires active care. Please follow these essential security rules:',
          '• NEVER Share OTPs: Never share your login OTP with anyone, including anyone claiming to be from BrandX support. BrandX staff will never ask for your OTP.',
          '• NEVER Share Passwords: Keep your password confidential. Do not write it down where others can see it.',
          '• Use a Strong, Unique Password: Create a password combining letters, numbers, and symbols that you do not use on other websites.',
          '• Avoid Suspicious Login Links: Only log in to BrandX through the official app or verified domain. Do not click unknown links sent via SMS, email, or messaging apps.',
          '• Review Information Before Sharing: Double-check customer phone numbers and bill details before dispatching invoices or sharing Khata balances.',
          '• Log Out from Shared Devices: If you use BrandX on a counter tablet or shared phone, log out at the end of the day or lock your device with a secure PIN/fingerprint.',
          '• Report Suspicious Activity: If you suspect unauthorized access or notice unfamiliar bills, contact support@brandx.in immediately.',
        ],
      },
      {
        heading: '2. How BrandX Safeguards Your Data (High-Level Overview)',
        body: [
          'BrandX applies industry-standard technical measures designed to protect your information:',
          '• Encryption in Transit: All data exchanged between your phone or browser and our servers is protected using HTTPS/TLS encryption.',
          '• Multi-Tenant Account Isolation: Your business data is logically separated in our database architecture so that no other merchant can access your invoices, customers, or ledger.',
          '• Secure Authentication Tokens: Access is authenticated using verified, short-lived security tokens to prevent unauthorized session reuse.',
          '• Role-Based Access Controls: Platform systems and administrative tools are restricted to authorized personnel with strict access controls.',
          '• Continuous Security Monitoring: We monitor systems for anomalies and update software components regularly.',
        ],
      },
      {
        heading: '3. Honest Security Disclosures',
        body: [
          'No internet-connected service can truthfully guarantee that it is "100% secure" or "unhackable."',
          'Security is a continuous shared effort between BrandX and our users. While we maintain rigorous controls to protect your data, safeguarding your login credentials and devices is your crucial responsibility.',
        ],
      },
      {
        heading: '4. Security Vulnerability Reporting',
        body: [
          'If you believe you have discovered a potential security vulnerability in BrandX, please disclose it responsibly by contacting our security team at support@brandx.in. We appreciate your assistance in keeping the platform safe.',
        ],
      },
    ],
  },

  licenses: {
    id: 'licenses',
    title: 'Open Source Licenses',
    titleHindi: 'ओपन सोर्स लाइसेंस (Open Source Licenses)',
    version: '1.0.0',
    effectiveDate: 'September 1, 2026',
    lastUpdated: 'September 27, 2026',
    summary: 'Acknowledgements and license notices for third-party open-source software libraries utilized by BrandX.',
    summaryHindi: 'BrandX द्वारा उपयोग की जाने वाली ओपन-सोर्स सॉफ़्टवेयर लाइब्रेरीज़ के लाइसेंस और सूचनाएं।',
    contactEmail: 'support@brandx.in',
    sections: [
      {
        heading: '1. Open Source Software Acknowledgements',
        body: [
          'BrandX is built using trusted open-source libraries and utilities. We gratefully acknowledge the contributions of open-source software authors and communities.',
          'The following components are included in our application bundle under their respective permissive open-source licenses.',
        ],
      },
      {
        heading: '2. Component Notices & Licenses',
        body: [
          '• Client Document & PDF Export Utilities — MIT License',
          '• Vector Interface Icons & Graphics — ISC License & Apache License 2.0',
          '• Canvas Image Rendering & Manipulation Utilities — MIT License',
          '• Mobile Device Bridge & File Access Layer — MIT License',
          '• Fluid Motion & Animation Controllers — MIT License',
          '• Data Sanitization & Security Utilities — Apache License 2.0',
        ],
      },
      {
        heading: '3. MIT License Grant Text',
        body: [
          'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:',
          'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
          'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
        ],
      },
      {
        heading: '4. Contact for Open Source Inquiries',
        body: [
          'For questions regarding open-source component licenses or source attributions, please contact support@brandx.in.',
        ],
      },
    ],
  },
};
