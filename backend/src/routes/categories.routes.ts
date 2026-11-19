import { Router } from "express";
import { getCategories } from "../controllers/categories.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getCategories);

export default router;
