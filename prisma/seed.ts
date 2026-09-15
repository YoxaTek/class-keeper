import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      email: "teacher@example.com",
      name: "陳老師",
      role: "TEACHER",
      locale: "en",
      passwordHash,
    },
  });

  const subject = await prisma.subject.upsert({
    where: { id: "seed-subject-basic" },
    update: {},
    create: { id: "seed-subject-basic", name: "Chinese — Basic" },
  });

  await prisma.term.upsert({
    where: { id: "seed-term-114-2" },
    update: {},
    create: {
      id: "seed-term-114-2",
      name: "114-2",
      subjectId: subject.id,
      teacherId: teacher.id,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-06-01"),
    },
  });

  console.log("Seeded teacher login: teacher@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
