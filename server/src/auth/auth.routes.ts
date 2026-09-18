import { Router, Request, Response } from "express";
import { login } from "./auth.service.js";
import {
  authenticateToken,
  AuthRequest,
} from "./auth.middleware.js";
import { getPrisma } from "../prisma.js";

const router = Router();


// ==============================
// Login API
// ==============================
router.post(
  "/login",
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
      } = req.body;


      if (
        typeof email !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "Email and password are required.",
          },
        });
      }


      const result = await login(
        email,
        password
      );


      res.cookie(
        "toktickit_session",
        result.sessionId,
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 1000,
        }
      );


      return res.status(200).json({
        data: {
          user: result.user,
        },
      });


    } catch (error) {

      if (
        error instanceof Error &&
        error.message === "ACCOUNT_INACTIVE"
      ) {
        return res.status(403).json({
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Account is inactive.",
          },
        });
      }


      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    }
  }
);



// ==============================
// Current User API
// ==============================
router.get(
  "/me",
  authenticateToken,
  async (
    req: AuthRequest,
    res: Response
  ) => {

    try {

      const prisma = getPrisma();


      const user =
        await prisma.user.findUnique({
          where: {
            id: req.user!.userId,
          },

          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            mustChangePassword: true,
            isActive: true,
          },
        });


      if (!user) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }


      return res.status(200).json({
        data: user,
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Unable to get current user.",
        },
      });

    }
  }
);



// ==============================
// Logout API
// ==============================
router.post(
  "/logout",
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const sessionId =
        req.cookies?.toktickit_session;


      if (sessionId) {

        const prisma = getPrisma();

        await prisma.session.deleteMany({
          where: {
            sessionId,
          },
        });

      }


      res.clearCookie(
        "toktickit_session",
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        }
      );


      return res.status(200).json({
        message: "Logged out successfully.",
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Logout failed.",
        },
      });

    }
  }
);
// ==============================
// Change Password API
// ==============================
router.post(
  "/change-password",
  authenticateToken,
  async (
    req: AuthRequest,
    res: Response
  ) => {

    try {

      const {
        currentPassword,
        newPassword,
      } = req.body;


      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string"
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "Current password and new password are required.",
          },
        });
      }


      if (newPassword.length < 8) {
        return res.status(400).json({
          error: {
            code: "WEAK_PASSWORD",
            message: "Password must be at least 8 characters.",
          },
        });
      }


      const prisma = getPrisma();


      const user =
        await prisma.user.findUnique({
          where: {
            id: req.user!.userId,
          },
        });


      if (!user) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }


      const bcrypt =
        await import("bcrypt");


      const valid =
        await bcrypt.compare(
          currentPassword,
          user.passwordHash
        );


      if (!valid) {
        return res.status(401).json({
          error: {
            code: "INVALID_PASSWORD",
            message: "Current password is incorrect.",
          },
        });
      }


      const newHash =
        await bcrypt.hash(
          newPassword,
          10
        );


      await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
      });


      return res.status(200).json({
        message: "Password changed successfully.",
      });


    } catch {

      return res.status(500).json({
        error: {
          code: "SERVER_ERROR",
          message: "Unable to change password.",
        },
      });

    }
  }
);

export default router;
