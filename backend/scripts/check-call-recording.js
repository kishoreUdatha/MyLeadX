const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const callId = process.argv[2] || "7d13ad08-2490-465d-b1c5-78900a6377f9";

async function checkCall() {
  console.log("Checking call:", callId);
  console.log("=".repeat(60));

  const call = await p.telecallerCall.findUnique({
    where: { id: callId },
    select: {
      id: true,
      status: true,
      outcome: true,
      duration: true,
      recordingUrl: true,
      recordingStatus: true,
      aiAnalyzed: true,
      callStartedAt: true,
      callEndedAt: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      transcript: true,
      sentiment: true,
      summary: true,
      telecaller: { select: { firstName: true, lastName: true, email: true } },
      rawImportRecord: { select: { id: true, name: true, phone: true } },
      lead: { select: { id: true, firstName: true, lastName: true, phone: true } }
    }
  });

  if (!call) {
    console.log("Call not found!");
    return;
  }

  console.log("\n--- CALL DETAILS ---");
  console.log("ID:", call.id);
  console.log("Status:", call.status);
  console.log("Outcome:", call.outcome);
  console.log("Duration:", call.duration, "seconds");
  console.log("AI Analyzed:", call.aiAnalyzed);

  console.log("\n--- RECORDING ---");
  console.log("Recording URL:", call.recordingUrl || "NOT RECORDED");
  console.log("Recording Status:", call.recordingStatus || "N/A");

  console.log("\n--- TIMESTAMPS ---");
  console.log("Created:", call.createdAt);
  console.log("Started:", call.startedAt || call.callStartedAt);
  console.log("Ended:", call.endedAt || call.callEndedAt);

  console.log("\n--- TELECALLER ---");
  console.log("Name:", call.telecaller?.firstName, call.telecaller?.lastName);
  console.log("Email:", call.telecaller?.email);

  console.log("\n--- CONTACT ---");
  if (call.lead) {
    console.log("Lead:", call.lead.firstName, call.lead.lastName);
    console.log("Phone:", call.lead.phone);
  } else if (call.rawImportRecord) {
    console.log("Raw Import:", call.rawImportRecord.name);
    console.log("Phone:", call.rawImportRecord.phone);
  }

  console.log("\n--- AI ANALYSIS ---");
  console.log("Transcript:", call.transcript ? call.transcript.substring(0, 200) + "..." : "NOT TRANSCRIBED");
  console.log("Sentiment:", call.sentiment);
  console.log("Summary:", call.summary);

  console.log("\n" + "=".repeat(60));
  if (!call.recordingUrl) {
    console.log("\nPOSSIBLE REASONS FOR NO RECORDING:");
    console.log("1. Telecaller phone doesn't support call recording");
    console.log("2. Accessibility service not enabled on phone");
    console.log("3. Call was too short (< 5 seconds)");
    console.log("4. Recording upload failed (network issue)");
    console.log("5. System call recording not found");
  }
}

checkCall().finally(() => p.$disconnect());
