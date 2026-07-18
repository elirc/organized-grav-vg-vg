const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function processEvent(event) {
  await prisma.integrationLog.create({
    data: {
      organizationId: event.organizationId,
      direction: "OUTBOUND",
      event: event.eventType,
      payload: event.payload,
      status: "SUCCESS",
    },
  });
}

async function runOnce() {
  const events = await prisma.domainEvent.findMany({
    where: {
      status: "PENDING",
      availableAt: {
        lte: new Date(),
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 50,
  });

  for (const event of events) {
    try {
      await prisma.domainEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSING",
          attempts: event.attempts + 1,
        },
      });

      await processEvent(event);

      await prisma.domainEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      const isDeadLetter = event.attempts + 1 >= 10;
      await prisma.domainEvent.update({
        where: { id: event.id },
        data: {
          status: isDeadLetter ? "DEAD_LETTER" : "FAILED",
          errorMessage: error.message,
        },
      });
    }
  }

  return events.length;
}

async function main() {
  const loop = process.argv.includes("--loop");

  if (!loop) {
    const count = await runOnce();
    console.log(`Processed ${count} events.`);
    return;
  }

  console.log("Starting domain event worker in loop mode.");
  for (;;) {
    const count = await runOnce();
    if (count === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
