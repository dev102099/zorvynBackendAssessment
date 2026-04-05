import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_take_home_key_change_me_later";
const JWT_EXPIRES_IN = "24h";

export class AuthService {
  /**
   * Registers a new user and assigns them a default role.
   */
  static async registerUser(
    email: string,
    password: string,
    roleName: string = "Viewer",
  ) {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists with this email.");
    }

    // 2. Fetch the requested Role ID
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new Error(`Role '${roleName}' not found in database.`);
    }

    // 3. Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create the user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        roleId: role.id,
      },
      // Return the user with their role data attached, but exclude the password!
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });

    return newUser;
  }

  /**
   * Authenticates a user and generates a JWT.
   */
  static async loginUser(email: string, password: string) {
    // Finding the user and grab their role + permissions
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    //  Verifying password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("User account is inactive.");
    }

    //  Flattening permissions into a simple array of strings (e.g., ['record:create', 'summary:read'])
    const userPermissions = user.role.permissions.map(
      (rp) => rp.permission.action,
    );

    //  Generating JWT payload
    const tokenPayload = {
      userId: user.id,
      role: user.role.name,
      permissions: userPermissions,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    //  Returning clean user data (no password) + token
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        permissions: userPermissions,
      },
    };
  }
}
