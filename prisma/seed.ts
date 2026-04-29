import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123!", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@techgeekstudio.com" },
    update: {},
    create: {
      email: "admin@techgeekstudio.com",
      password: hashedPassword,
      name: "TGS Admin",
      company: "TechGeekStudio",
      website: "https://techgeekstudio.com",
      role: "admin",
    },
  });

  console.log("Seeded admin user:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
