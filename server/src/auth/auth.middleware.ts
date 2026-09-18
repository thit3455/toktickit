import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
  };
}


export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId =
      req.cookies?.toktickit_session;
      console.log("COOKIES:", req.cookies);
      console.log("SESSION ID:", sessionId);
     

    if (!sessionId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
        },
      });
    }


    const prisma = getPrisma();


    const session =
      await prisma.session.findUnique({
        where: {
          sessionId,
        },

        include: {
          user: true,
        },
      });


    if (!session) {
      return res.status(401).json({
        error: {
          code: "INVALID_SESSION",
          message: "Session is invalid.",
        },
      });
    }


    if (
      session.expiresAt < new Date()
    ) {
      await prisma.session.delete({
        where: {
          sessionId,
        },
      });

      return res.status(401).json({
        error: {
          code: "SESSION_EXPIRED",
          message: "Session expired.",
        },
      });
    }


    if (!session.user.isActive) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Account is inactive.",
        },
      });
    }


    req.user = {
      userId: session.user.id,
      role: session.user.role,
    };


    next();


  } catch {

    return res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Authentication failed.",
      },
    });

  }
}