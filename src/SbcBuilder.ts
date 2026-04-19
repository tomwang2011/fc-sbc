import { LeagueSolver } from './solvers/LeagueSolver';
import { DeCloggerSolver } from './solvers/DeCloggerSolver';
import { EfficientSolver } from './solvers/EfficientSolver';
import { ChallengeSolver } from './solvers/ChallengeSolver';
import { SolverSettings } from './types';
import { Inventory } from './core/Inventory';
import { Utils } from './core/Utils';

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

  public static async clearSquad() {
    const ctx = Utils.getSbcContext();
    if (!ctx) throw new Error("SBC Screen Not Found");
    const { squad, challenge, controller } = ctx;
    squad.setPlayers(new Array(23).fill(null));
    await Utils.saveSquad(challenge, squad, controller);
  }
}
