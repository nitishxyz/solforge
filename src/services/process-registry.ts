import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Config } from "../types/config.js";

export interface RunningValidator {
  id: string;
  name: string;
  pid: number;
  rpcPort: number;
  faucetPort: number;
  rpcUrl: string;
  faucetUrl: string;
  configPath: string;
  startTime: Date;
  status: "running" | "stopped" | "error";
  apiServerPort?: number;
  apiServerUrl?: string;
  apiServerPid?: number;
}

export class ProcessRegistry {
  private registryPath: string;

  constructor() {
    // Store registry in user's home directory
    this.registryPath = join(homedir(), ".solforge", "running-validators.json");
  }

  /**
   * Get all running validators
   */
  getRunning(): RunningValidator[] {
    if (!existsSync(this.registryPath)) {
      return [];
    }

    try {
      const content = readFileSync(this.registryPath, "utf-8");
      const validators = JSON.parse(content) as RunningValidator[];

      // Convert startTime strings back to Date objects
      return validators.map((v) => ({
        ...v,
        startTime: new Date(v.startTime),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Register a new running validator
   */
  register(validator: RunningValidator): void {
    const validators = this.getRunning();

    // Remove any existing entry with the same ID
    const updated = validators.filter((v) => v.id !== validator.id);
    updated.push(validator);

    this.save(updated);
  }

  /**
   * Unregister a validator
   */
  unregister(id: string): void {
    const validators = this.getRunning();
    const updated = validators.filter((v) => v.id !== id);
    this.save(updated);
  }

  /**
   * Update validator status
   */
  updateStatus(id: string, status: RunningValidator["status"]): void {
    const validators = this.getRunning();
    const validator = validators.find((v) => v.id === id);

    if (validator) {
      validator.status = status;
      this.save(validators);
    }
  }

  /**
   * Get validator by ID
   */
  getById(id: string): RunningValidator | undefined {
    return this.getRunning().find((v) => v.id === id);
  }

  /**
   * Get validator by PID
   */
  getByPid(pid: number): RunningValidator | undefined {
    return this.getRunning().find((v) => v.pid === pid);
  }

  /**
   * Get validator by port
   */
  getByPort(port: number): RunningValidator | undefined {
    return this.getRunning().find(
      (v) => v.rpcPort === port || v.faucetPort === port
    );
  }

  /**
   * Check if a process is actually running
   */
  async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // Send signal 0 to check if process exists
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up dead processes from registry
   */
  async cleanup(): Promise<void> {
    const validators = this.getRunning();
    const active: RunningValidator[] = [];

    for (const validator of validators) {
      if (await this.isProcessRunning(validator.pid)) {
        active.push(validator);
      }
    }

    this.save(active);
  }

  /**
   * Save validators to registry file
   */
  private save(validators: RunningValidator[]): void {
    // Ensure directory exists
    const dir = join(homedir(), ".solforge");
    if (!existsSync(dir)) {
      require("fs").mkdirSync(dir, { recursive: true });
    }

    writeFileSync(this.registryPath, JSON.stringify(validators, null, 2));
  }
}

// Singleton instance
export const processRegistry = new ProcessRegistry();
