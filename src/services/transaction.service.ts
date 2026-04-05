import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";

export class TransactionService {
  static async create(userId: string, data: any) {
    return await prisma.transaction.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  static async findAll(filters: any) {
    const whereClause: Prisma.TransactionWhereInput = {};

    if (filters.type) whereClause.type = filters.type;
    if (filters.category) whereClause.category = filters.category;
    if (filters.startDate || filters.endDate) {
      whereClause.date = {};
      if (filters.startDate) whereClause.date.gte = new Date(filters.startDate);
      if (filters.endDate) whereClause.date.lte = new Date(filters.endDate);
    }
    if (filters.search) {
      whereClause.OR = [
        {
          notes: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    // 1. Calculate Pagination Math
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit; //

    // 2. Fire queries concurrently: Get the count AND the data
    const [totalRecords, transactions] = await Promise.all([
      prisma.transaction.count({ where: whereClause }),
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        skip: skip,
        take: limit,
      }),
    ]);

    // 3. Calculate metadata for the frontend
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: transactions,
      meta: {
        totalRecords,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async findById(id: string, userId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!transaction)
      throw new Error("Transaction not found or access denied.");
    return transaction;
  }

  static async update(id: string, userId: string, data: any) {
    // 1. Verify ownership first
    await this.findById(id, userId);

    // 2. Perform update
    return await prisma.transaction.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string, userId: string) {
    // 1. Verify ownership first
    await this.findById(id, userId);

    // 2. Perform deletion
    await prisma.transaction.delete({
      where: { id },
    });
  }

  static async getSummary(userId: string, filters: any) {
    const whereClause: Prisma.TransactionWhereInput = {};

    // Apply date filters if provided
    if (filters.startDate || filters.endDate) {
      whereClause.date = {};
      if (filters.startDate) whereClause.date.gte = new Date(filters.startDate);
      if (filters.endDate) whereClause.date.lte = new Date(filters.endDate);
    }

    //  FIRE ALL QUERIES CONCURRENTLY
    const [totalsData, categoryData, recentActivity, allForTrends] =
      await Promise.all([
        // Query 1: Total Income & Expenses
        prisma.transaction.groupBy({
          by: ["type"],
          where: whereClause,
          _sum: { amount: true },
        }),

        // Query 2: Category-wise totals
        prisma.transaction.groupBy({
          by: ["category", "type"],
          where: whereClause,
          _sum: { amount: true },
        }),

        // Query 3: Recent Activity (Last 5 transactions)
        prisma.transaction.findMany({
          where: whereClause,
          orderBy: { date: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            type: true,
            category: true,
            date: true,
            notes: true,
          },
        }),

        // Query 4: Raw data for trends (Ordered oldest to newest for charts)
        prisma.transaction.findMany({
          where: whereClause,
          orderBy: { date: "asc" },
          select: { amount: true, type: true, date: true },
        }),
      ]);

    // --- 1. FORMAT TOTALS & BALANCE ---
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const group of totalsData) {
      const sum = group._sum.amount?.toNumber() || 0;
      if (group.type === "INCOME") totalIncome = sum;
      if (group.type === "EXPENSE") totalExpenses = sum;
    }

    // --- 2. FORMAT CATEGORIES ---
    const categoryBreakdown = categoryData.map((c) => ({
      category: c.category,
      type: c.type,
      total: c._sum.amount?.toNumber() || 0,
    }));

    // --- 3. FORMAT MONTHLY TRENDS ---
    // We group the raw data into a dictionary: { "2024-03": { income: 1000, expense: 500 } }
    const monthlyTrends = allForTrends.reduce(
      (acc, current) => {
        // Extract just the YYYY-MM part of the date
        const monthYear = current.date.toISOString().substring(0, 7);
        const amount = current.amount.toNumber();

        if (!acc[monthYear]) {
          acc[monthYear] = { month: monthYear, income: 0, expense: 0 };
        }

        if (current.type === "INCOME") acc[monthYear].income += amount;
        if (current.type === "EXPENSE") acc[monthYear].expense += amount;

        return acc;
      },
      {} as Record<string, { month: string; income: number; expense: number }>,
    );

    // Convert the dictionary back into an array for the frontend
    const trendsArray = Object.values(monthlyTrends);

    // --- RETURN THE MASTER DASHBOARD OBJECT ---
    return {
      overview: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
      },
      categoryBreakdown,
      recentActivity,
      monthlyTrends: trendsArray,
    };
  }
}
