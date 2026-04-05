import { prisma } from "../src/lib/prisma";

async function main(): Promise<void> {
  console.log("🌱 Starting database seeding...");

  // 1. Prepare Permissions Data
  const permissionsData: { action: string }[] = [
    { action: "record:create" },
    { action: "record:read" },
    { action: "record:update" },
    { action: "record:delete" },
    { action: "summary:read" },
    { action: "users:manage" },
  ];

  // 2. Insert Permissions (Note: using singular 'permission' matching the model name)
  const createdPermissions = await prisma.permission.createMany({
    data: permissionsData,
    skipDuplicates: true, // Prevents crashing if you run this twice!
  });

  console.log(`✅ Processed ${createdPermissions.count} permissions.`);

  // 3. Prepare Roles Data
  const roles = [
    {
      name: "Admin",
      perms: [
        "record:create",
        "record:read",
        "record:update",
        "record:delete",
        "summary:read",
        "users:manage",
      ],
    },
    {
      name: "Analyst",
      perms: ["record:read", "summary:read"],
    },
    {
      name: "Viewer",
      perms: ["summary:read"],
    },
  ];

  // 4. Fetch all permissions to get their generated IDs
  const allPerms = await prisma.permission.findMany();
  const getPermId = (action: string) =>
    allPerms.find((p) => p.action === action)?.id || "";

  // 5. Insert Roles and Link their Permissions
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name },
    });

    for (const action of role.perms) {
      const permissionId = getPermId(action);

      // Safety check just in case a permission name was mistyped
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRole.id,
            permissionId: permissionId,
          },
        },
        update: {},
        create: {
          roleId: createdRole.id,
          permissionId: permissionId,
        },
      });
    }
    console.log(`✅ Seeded role: ${role.name}`);
  }

  console.log("🎉 Seeding fully complete!");

  // ... (Your existing roles and permissions code is above this)

  console.log("👤 Setting up test user...");

  // 1. Find the Admin role we just created
  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  if (!adminRole) throw new Error("Admin role not found!");

  // 2. Upsert a test user so we have someone to own the transactions
  const testUser = await prisma.user.upsert({
    where: { email: "ceo@example.com" },
    update: {},
    create: {
      email: "ceo@example.com",
      passwordHash: "$2b$10$YourHashedPasswordHere", // We bypass the API so we just fake the hash
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  console.log("🧹 Cleaning up old transactions...");
  // 3. Delete existing transactions so we start fresh every time we seed
  await prisma.transaction.deleteMany({});

  console.log("💰 Seeding realistic financial data...");
  // 4. Create a realistic dataset spread across Q1
  const transactions = [
    // --- JANUARY ---
    {
      amount: 5000,
      type: "INCOME",
      category: "Salary",
      date: new Date("2024-01-01T10:00:00Z"),
      userId: testUser.id,
      notes: "Jan Salary",
    },
    {
      amount: 1500,
      type: "EXPENSE",
      category: "Rent",
      date: new Date("2024-01-05T10:00:00Z"),
      userId: testUser.id,
    },
    {
      amount: 300,
      type: "EXPENSE",
      category: "Utilities",
      date: new Date("2024-01-12T10:00:00Z"),
      userId: testUser.id,
    },
    {
      amount: 450,
      type: "EXPENSE",
      category: "Groceries",
      date: new Date("2024-01-20T10:00:00Z"),
      userId: testUser.id,
    },

    // --- FEBRUARY ---
    {
      amount: 5000,
      type: "INCOME",
      category: "Salary",
      date: new Date("2024-02-01T10:00:00Z"),
      userId: testUser.id,
      notes: "Feb Salary",
    },
    {
      amount: 800,
      type: "INCOME",
      category: "Freelance",
      date: new Date("2024-02-10T10:00:00Z"),
      userId: testUser.id,
      notes: "Consulting gig",
    },
    {
      amount: 1500,
      type: "EXPENSE",
      category: "Rent",
      date: new Date("2024-02-05T10:00:00Z"),
      userId: testUser.id,
    },
    {
      amount: 550,
      type: "EXPENSE",
      category: "Groceries",
      date: new Date("2024-02-15T10:00:00Z"),
      userId: testUser.id,
    },
    {
      amount: 200,
      type: "EXPENSE",
      category: "Entertainment",
      date: new Date("2024-02-22T10:00:00Z"),
      userId: testUser.id,
      notes: "Concert tickets",
    },

    // --- MARCH ---
    {
      amount: 5000,
      type: "INCOME",
      category: "Salary",
      date: new Date("2024-03-01T10:00:00Z"),
      userId: testUser.id,
      notes: "Mar Salary",
    },
    {
      amount: 1500,
      type: "EXPENSE",
      category: "Rent",
      date: new Date("2024-03-05T10:00:00Z"),
      userId: testUser.id,
    },
    {
      amount: 600,
      type: "EXPENSE",
      category: "Groceries",
      date: new Date("2024-03-12T10:00:00Z"),
      userId: testUser.id,
    },
    {
      amount: 120,
      type: "EXPENSE",
      category: "Utilities",
      date: new Date("2024-03-18T10:00:00Z"),
      userId: testUser.id,
    },
  ];

  // 5. Bulk insert them into the database
  const createdTransactions = await prisma.transaction.createMany({
    data: transactions,
  });

  console.log(
    `✅ Successfully seeded ${createdTransactions.count} transactions!`,
  );
}

main()
  .catch(async (e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
