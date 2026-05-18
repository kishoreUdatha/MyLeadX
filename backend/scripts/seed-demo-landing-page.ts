import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { slug: 'smartgrow-info-tech' },
  });
  if (!org) {
    throw new Error('SMARTGROW org not found. Run create-super-admin first.');
  }

  const page = await prisma.landingPage.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: 'demo' },
    },
    update: { isPublished: true, publishedAt: new Date() },
    create: {
      organizationId: org.id,
      name: 'MyLeadX Demo Landing - Test',
      slug: 'demo',
      title: 'Book a Free Demo of MyLeadX',
      description: 'AI-powered CRM for Indian businesses',
      isPublished: true,
      publishedAt: new Date(),
      content: {
        sections: [
          {
            id: '1',
            type: 'hero',
            content: {
              headline: 'Stop Losing Leads to Manual Chaos',
              subheadline:
                'AI-powered CRM that helps your team call, follow up, and close 3x faster',
              buttonText: 'Book Free Demo',
            },
          },
          {
            id: '2',
            type: 'features',
            content: {
              title: 'Built for Indian Businesses',
              features: [
                { title: 'AI Calling', description: 'Voice agents in Hindi, English, and 8 regional languages' },
                { title: 'WhatsApp Integration', description: 'Send template messages and automate follow-ups' },
                { title: 'Lead Auto-Assignment', description: 'Route leads to the right rep based on rules' },
              ],
            },
          },
          {
            id: '3',
            type: 'cta',
            content: {
              headline: 'Trusted by 1000+ Indian businesses',
              buttonText: 'Get Started',
            },
          },
          {
            id: '4',
            type: 'form',
            content: {
              title: 'Get Your Free Demo',
              fields: ['name', 'email', 'phone', 'message'],
            },
          },
        ],
      },
      seoSettings: {
        metaTitle: 'MyLeadX - AI CRM for Indian SMBs',
        metaDescription: 'Book a free demo. AI calling, WhatsApp, lead routing.',
      },
    },
  });

  console.log('Demo landing page created:');
  console.log('  Slug:', page.slug);
  console.log('  Public URL: http://localhost:5173/p/demo');
  console.log('  With UTM:   http://localhost:5173/p/demo?utm_source=facebook&utm_campaign=test_run&utm_medium=cpc');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
