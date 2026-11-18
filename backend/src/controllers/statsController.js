// backend/src/controllers/statsController.js
// À ADAPTER (2/3) : même chemin d'import que dans readingGoalController.js
import { HttpError } from '../utils/HttpError.js'
import { getReadingStats } from "../services/statsService.js";

export async function getMyStats(req, res, next) {
  try {
    // Année facultative (?year=2026) ; par défaut : l'année en cours
    const year =
      req.query.year === undefined
        ? new Date().getFullYear()
        : Number(req.query.year);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      // À ADAPTER (3/3) : vérifie l'ordre des arguments de HttpError
      // (dans readingGoalController.js, regarde comment un 400 est créé)
      throw new HttpError(400, "L'année est invalide.");
    }

    // req.userId vient du jeton (requireAuth), jamais du client
    const data = await getReadingStats(req.userId, year);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}