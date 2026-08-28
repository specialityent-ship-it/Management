import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123";

function minutes(hour: number, minute = 0) {
  return hour * 60 + minute;
}

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Clinic Administrator",
      passwordHash,
      role: "ADMIN",
    },
  });

  const reception = await prisma.user.upsert({
    where: { email: "reception@example.com" },
    update: {},
    create: {
      email: "reception@example.com",
      name: "Front Desk",
      passwordHash,
      role: "RECEPTION",
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@example.com" },
    update: {},
    create: {
      email: "doctor@example.com",
      name: "Dr A. Rao",
      passwordHash,
      role: "DOCTOR",
    },
  });

  const doctor = await prisma.doctor.upsert({
    where: { slug: "a-rao" },
    update: {},
    create: {
      slug: "a-rao",
      userId: doctorUser.id,
      name: "Dr A. Rao",
      qualifications: "MBBS, MS (ENT)",
      specialty: "ENT & Head-Neck Surgery",
      bio: "Consultant ENT surgeon with a special interest in endoscopic sinus surgery and paediatric airway. Runs both outpatient clinics and a weekly operating list.",
      yearsExp: 14,
      regNumber: "REG-000000",
      consultFee: 80000,
    },
  });

  const secondDoctor = await prisma.doctor.upsert({
    where: { slug: "s-menon" },
    update: {},
    create: {
      slug: "s-menon",
      name: "Dr S. Menon",
      qualifications: "MBBS, DNB (ENT)",
      specialty: "Otology & Hearing",
      bio: "Focuses on hearing loss, tinnitus and middle-ear surgery. Sees new and follow-up patients across the week.",
      yearsExp: 9,
      consultFee: 60000,
    },
  });

  // Consulting hours: both doctors Monday–Saturday mornings, Dr Rao also
  // evenings on Tuesday and Thursday. dayOfWeek 0 = Sunday.
  await prisma.availability.deleteMany({ where: { doctorId: { in: [doctor.id, secondDoctor.id] } } });
  await prisma.availability.createMany({
    data: [
      ...[1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        doctorId: doctor.id,
        dayOfWeek,
        startMinute: minutes(9),
        endMinute: minutes(13),
        slotMin: 15,
      })),
      ...[2, 4].map((dayOfWeek) => ({
        doctorId: doctor.id,
        dayOfWeek,
        startMinute: minutes(17),
        endMinute: minutes(20),
        slotMin: 15,
      })),
      ...[1, 3, 5].map((dayOfWeek) => ({
        doctorId: secondDoctor.id,
        dayOfWeek,
        startMinute: minutes(10),
        endMinute: minutes(14),
        slotMin: 20,
      })),
    ],
  });

  const services = [
    {
      slug: "opd-consultation",
      displayOrder: 10,
      name: "OPD consultation",
      kind: "OPD" as const,
      description:
        "A full outpatient consultation with an ENT specialist, including examination and a written plan.",
      durationMin: 15,
      priceMinor: 80000,
      depositMinor: 20000,
      requiresDeposit: true,
    },
    {
      slug: "follow-up-review",
      displayOrder: 20,
      name: "Follow-up review",
      kind: "OPD" as const,
      description: "A shorter review appointment for existing patients, including report review.",
      durationMin: 10,
      priceMinor: 40000,
      depositMinor: 0,
      requiresDeposit: false,
    },
    {
      slug: "hearing-assessment",
      displayOrder: 30,
      name: "Hearing assessment",
      kind: "DIAGNOSTIC" as const,
      description: "Pure-tone audiometry and tympanometry with a same-day report.",
      durationMin: 30,
      priceMinor: 120000,
      depositMinor: 30000,
      requiresDeposit: true,
    },
    {
      slug: "teleconsultation",
      displayOrder: 40,
      name: "Teleconsultation",
      kind: "TELECONSULT" as const,
      description: "A video consultation for advice, second opinions and report review.",
      durationMin: 15,
      priceMinor: 50000,
      depositMinor: 50000,
      requiresDeposit: true,
    },
    {
      slug: "endoscopic-sinus-surgery",
      displayOrder: 50,
      name: "Endoscopic sinus surgery",
      kind: "OT" as const,
      description:
        "Day-case functional endoscopic sinus surgery under general anaesthesia. Final estimate confirmed after consultation.",
      durationMin: 90,
      priceMinor: 6500000,
      depositMinor: 1000000,
      requiresDeposit: false,
    },
    {
      slug: "tympanoplasty",
      displayOrder: 60,
      name: "Tympanoplasty",
      kind: "OT" as const,
      description: "Repair of the eardrum, usually as a day case. Estimate confirmed at consultation.",
      durationMin: 120,
      priceMinor: 7500000,
      depositMinor: 1000000,
      requiresDeposit: false,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: { displayOrder: service.displayOrder },
      create: {
        ...service,
        doctors: {
          connect:
            service.slug === "hearing-assessment"
              ? [{ id: secondDoctor.id }]
              : [{ id: doctor.id }, { id: secondDoctor.id }],
        },
      },
    });
  }

  for (const name of ["Theatre 1", "Theatre 2"]) {
    await prisma.theatre.upsert({ where: { name }, update: {}, create: { name } });
  }

  const testimonials = [
    { author: "R. Sharma", body: "Booked online in two minutes and was seen right on time. The whole process was clear from start to finish.", rating: 5 },
    { author: "P. Nair", body: "The team explained the procedure and the cost upfront. No surprises at all, and the follow-up call was a nice touch.", rating: 5 },
    { author: "K. Iyer", body: "Very organised. My surgery date, pre-op checks and review were all arranged in one visit.", rating: 5 },
  ];

  const existingTestimonials = await prisma.testimonial.count();
  if (existingTestimonials === 0) {
    await prisma.testimonial.createMany({ data: testimonials });
  }

  console.log("Seeded.");
  console.log(`  Admin      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Reception  ${reception.email} / ${ADMIN_PASSWORD}`);
  console.log(`  Doctor     ${doctorUser.email} / ${ADMIN_PASSWORD}`);
  console.log(`  Admin user id ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
