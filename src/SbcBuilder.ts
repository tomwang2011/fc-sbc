import { LeagueSolver } from './solvers/LeagueSolver';
import { DeCloggerSolver } from './solvers/DeCloggerSolver';
import { EfficientSolver } from './solvers/EfficientSolver';
import { ChallengeSolver } from './solvers/ChallengeSolver';
import { SolverSettings } from './types';
import { Inventory } from './core/Inventory';

export class SbcBuilder {
  public static async primeInventory(targetLevels: string[] = []) {
    return await Inventory.primeInventory(targetLevels);
  }

  public static getMemory() {
    return Inventory.memory;
  }

  public static async solveLeague(log: (m: string) => void, settings: SolverSettings) {
    await LeagueSolver.solve(log, settings);
  }

  public static async solveDeClogger(log: (m: string) => void, settings: SolverSettings) {
    await DeCloggerSolver.solve(log, settings);
  }

  public static async solveEfficient(log: (m: string) => void, settings: SolverSettings) {
    await EfficientSolver.solve(log, settings);
  }

  public static async solveChallenge(log: (m: string) => void, settings: SolverSettings) {
    await ChallengeSolver.solve(log, settings);
  }
}
