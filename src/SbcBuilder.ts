import { SolverSettings } from './types';
import { Inventory } from './core/Inventory';
import { EfficientSolver } from './solvers/EfficientSolver';
import { DeCloggerSolver } from './solvers/DeCloggerSolver';
import { LeagueSolver } from './solvers/LeagueSolver';

/**
 * SBC BUILDER FACADE
 * Orchestrates core modules and provides a simplified interface for the UI.
 */
export class SbcBuilder {
  public static async primeInventory(targetLevels: string[] = []) {
    return await Inventory.primeInventory(targetLevels);
  }

  public static async solveEfficient(log: (m: string) => void, settings: SolverSettings) {
    return await EfficientSolver.solve(log, settings);
  }

  public static async solveDeClogger(log: (m: string) => void, settings: SolverSettings) {
    return await DeCloggerSolver.solve(log, settings);
  }

  public static async solveLeague(log: (m: string) => void, settings: SolverSettings) {
    return await LeagueSolver.solve(log, settings);
  }
}
