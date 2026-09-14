import { Router, type Request, type Response } from "express";

import { databasePool } from "../database.js";
import {
  AnalyticsEventValidationError,
  AnalyticsUserNotFoundError,
  createAnalyticsEvent,
} from "../services/analytics.service.js";

const router = Router();

router.post("/events", async (req: Request, res: Response) => {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
    });
  }

  try {
    const event = await createAnalyticsEvent(
      databasePool,
      firebaseUser.uid,
      req.body,
    );

    return res.status(201).json({ data: event });
  } catch (error) {
    if (error instanceof AnalyticsEventValidationError) {
      return res.status(400).json({
        error: {
          code: "ANALYTICS_EVENT_INVALID",
          message: "Analytics event 형식이 올바르지 않습니다.",
        },
      });
    }

    if (error instanceof AnalyticsUserNotFoundError) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        },
      });
    }

    throw error;
  }
});

export default router;
