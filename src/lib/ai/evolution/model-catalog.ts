import type { EvolutionModel } from "./types";

export class EvolutionModelCatalog {
  private readonly models =
    new Map<string, EvolutionModel>();

  register(model: EvolutionModel): boolean {
    const key = this.getKey(model.provider, model.id);

    if (this.models.has(key)) {
      return false;
    }

    if (model.status !== "DISCOVERED") {
      return false;
    }

    this.models.set(key, {
      ...model,
      capabilities: [...model.capabilities],
    });

    return true;
  }

  get(provider: string, id: string): EvolutionModel | null {
    const model = this.models.get(
      this.getKey(provider, id)
    );

    return model
      ? { ...model, capabilities: [...model.capabilities] }
      : null;
  }

  list(): EvolutionModel[] {
    return Array.from(this.models.values()).map(
      (model) => ({
        ...model,
        capabilities: [...model.capabilities],
      })
    );
  }

  listByStatus(
    status: EvolutionModel["status"]
  ): EvolutionModel[] {
    return this.list().filter(
      (model) => model.status === status
    );
  }

  private getKey(provider: string, id: string): string {
    return JSON.stringify([provider, id]);
  }
}
