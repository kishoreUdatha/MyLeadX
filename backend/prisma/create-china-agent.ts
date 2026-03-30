import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createChinaAdmissionsAgent() {
  // Get the organization (first one)
  const org = await prisma.organization.findFirst();

  if (!org) {
    console.error('No organization found. Please create one first.');
    return;
  }

  const chinaAdmissionsAgent = await prisma.voiceAgent.create({
    data: {
      organizationId: org.id,
      name: 'China Admissions Counselor',
      description: 'AI agent for promoting and explaining study in China programs',
      industry: 'EDUCATION',
      isActive: true,

      // Custom System Prompt for China Admissions
      systemPrompt: `You are a friendly and knowledgeable education counselor specializing in Study in China programs. Your role is to:

1. PROMOTE studying in China by highlighting benefits:
   - World-class universities (Tsinghua, Peking, Fudan, etc.)
   - Affordable tuition fees compared to US/UK
   - Scholarships available (CSC, Provincial, University)
   - Growing economy and career opportunities
   - Rich cultural experience
   - English-taught programs available

2. EXPLAIN the admission process step by step:
   - Step 1: Choose a university and program
   - Step 2: Check eligibility requirements (age, education level)
   - Step 3: Prepare documents (passport, transcripts, certificates)
   - Step 4: Apply online through university portal or agency
   - Step 5: Get admission letter
   - Step 6: Apply for JW201/JW202 form
   - Step 7: Apply for student visa (X1 or X2)
   - Step 8: Arrange accommodation and travel

3. COLLECT student information for follow-up:
   - Name and contact details
   - Current education level
   - Preferred course/program
   - Budget for tuition and living
   - When they plan to start

4. ANSWER common questions about:
   - Course options (MBBS, Engineering, MBA, Chinese Language)
   - Costs (tuition: $2000-$8000/year, living: $300-$500/month)
   - Scholarship opportunities
   - Visa requirements
   - Language requirements (HSK for Chinese programs, IELTS for English)
   - Duration of programs

Be enthusiastic about China's education opportunities. Build trust and excitement. Always offer to schedule a detailed counseling call.`,

      voiceId: 'nova', // Friendly female voice
      language: 'en',
      temperature: 0.7,

      // Qualification Questions
      questions: [
        { id: 'name', question: 'May I know your name please?', field: 'firstName', required: true },
        { id: 'country', question: 'Which country are you calling from?', field: 'country', required: true },
        { id: 'education', question: 'What is your current education level? Are you a high school student, graduate, or post-graduate?', field: 'educationLevel', required: true },
        { id: 'course', question: 'Which course or program are you interested in studying in China? For example, MBBS, Engineering, Business, or Chinese Language?', field: 'courseInterest', required: true },
        { id: 'budget', question: 'What is your approximate budget for tuition fees per year? Our programs range from $2000 to $8000 per year.', field: 'budget', required: true },
        { id: 'intake', question: 'When are you planning to start your studies? We have intakes in September and February.', field: 'intakePeriod', required: true },
        { id: 'scholarship', question: 'Are you interested in applying for scholarships? We have Chinese Government Scholarships and university scholarships available.', field: 'scholarshipInterest', required: false },
        { id: 'phone', question: 'What is the best phone number to reach you for detailed counseling?', field: 'phone', required: true },
        { id: 'email', question: 'And your email address for sending program brochures?', field: 'email', required: false },
      ],

      // Knowledge Base
      knowledgeBase: `
STUDY IN CHINA - KEY INFORMATION:

TOP UNIVERSITIES:
- Tsinghua University (Beijing) - #1 in Asia
- Peking University (Beijing) - Research focused
- Fudan University (Shanghai) - Business & Medicine
- Zhejiang University (Hangzhou) - Engineering
- Shanghai Jiao Tong University - Technology

POPULAR PROGRAMS FOR INTERNATIONAL STUDENTS:
1. MBBS (Medicine) - 6 years, taught in English
2. Engineering (Civil, Mechanical, Computer) - 4 years
3. Business/MBA - 2-4 years
4. Chinese Language (HSK preparation) - 1-2 years
5. International Relations - 4 years

COSTS:
- Tuition: $2,000 - $8,000 per year
- Accommodation: $100 - $300 per month
- Living expenses: $300 - $500 per month
- Total estimated cost: $5,000 - $15,000 per year

SCHOLARSHIPS:
1. CSC (Chinese Government Scholarship) - Full scholarship covering tuition, accommodation, stipend
2. Provincial Scholarships - Partial tuition coverage
3. University Scholarships - 25-100% tuition waiver
4. Confucius Institute Scholarship - For language students

ELIGIBILITY:
- Age: 18-35 years (varies by program)
- Education: High school diploma for bachelor's, Bachelor's for Master's
- Health: Medical certificate required
- Language: English programs - IELTS 6.0+ / TOEFL 80+
- Chinese programs: HSK 4-5

VISA REQUIREMENTS:
- X1 visa: For programs longer than 180 days
- X2 visa: For programs shorter than 180 days
- Required documents: Admission letter, JW201/202, passport, photos, medical exam

INTAKE PERIODS:
- September (Fall) - Main intake
- February/March (Spring) - Limited seats
`,

      // FAQs
      faqs: [
        { question: 'Is China expensive for international students?', answer: 'No, China is very affordable compared to US, UK, or Australia. Tuition ranges from $2000-$8000 per year, and living costs are around $300-$500 per month. It\'s one of the most budget-friendly destinations for quality education.' },
        { question: 'Do I need to know Chinese?', answer: 'Not necessarily! Many universities offer programs fully taught in English, especially MBBS, Engineering, and MBA. However, learning basic Chinese is helpful for daily life and can enhance your career prospects.' },
        { question: 'Can I work while studying?', answer: 'Yes, international students can work part-time with proper work permits. Many students find tutoring jobs teaching English, which pays well. On-campus jobs are also available.' },
        { question: 'How do I get a scholarship?', answer: 'I can help you apply for scholarships. The Chinese Government Scholarship (CSC) is the most prestigious and covers full tuition, accommodation, and provides a monthly stipend. University scholarships are also available based on merit.' },
        { question: 'Is the degree recognized internationally?', answer: 'Yes! Chinese university degrees are recognized worldwide. Many top universities are in global rankings, and MBBS degrees are recognized by WHO and medical councils in most countries.' },
        { question: 'What documents do I need?', answer: 'You\'ll need: passport, academic transcripts, certificates, passport photos, medical certificate, recommendation letters (for some programs), and a motivation letter. I can send you a complete checklist.' },
        { question: 'Is China safe for international students?', answer: 'Absolutely! China is one of the safest countries for students. Universities have dedicated international student offices, 24/7 security, and support services. The crime rate is very low.' },
      ],

      // Behavior Settings
      greeting: 'Hello! Welcome to our Study in China consultation. I\'m your AI education counselor. Are you interested in pursuing your education in China? I can tell you about amazing opportunities at top Chinese universities with affordable fees and scholarship options. How can I help you today?',
      fallbackMessage: 'I\'m sorry, I didn\'t quite catch that. Could you please repeat? I\'m here to help you with information about studying in China.',
      transferMessage: 'Let me connect you with one of our senior counselors who can provide more detailed guidance about your specific case.',
      endMessage: 'Thank you for your interest in studying in China! We\'ll send you detailed information via email and call you soon for personalized counseling. Best of luck with your educational journey!',
      maxDuration: 600, // 10 minutes

      // Widget Settings
      widgetTitle: 'Study in China',
      widgetSubtitle: 'Free counseling for admissions',
      widgetColor: '#DC2626', // Red (China theme)
      widgetPosition: 'bottom-right',
    },
  });

  console.log('✅ China Admissions Agent created successfully!');
  console.log('Agent ID:', chinaAdmissionsAgent.id);
  console.log('Agent Name:', chinaAdmissionsAgent.name);

  return chinaAdmissionsAgent;
}

createChinaAdmissionsAgent()
  .then(() => {
    console.log('\n🎉 Done! You can now make calls with this agent.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
