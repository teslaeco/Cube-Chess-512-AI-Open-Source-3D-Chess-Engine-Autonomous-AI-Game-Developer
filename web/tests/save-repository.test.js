import { describe, expect, it } from "vitest";
import { GamePresentation } from "../app/GamePresentation.js";
import { SaveRepository } from "../storage/SaveRepository.js";

describe("versioned local save repository", () => {
  it("stores, lists, renames, loads and deletes a game without cloud access", async () => {
    const repository = new SaveRepository(null);
    const presentation = new GamePresentation();
    const serialized = presentation.serialize();

    await repository.put(serialized, { name: "Test game" });
    expect(await repository.list()).toMatchObject([
      { id: serialized.id, name: "Test game", moveCount: 0 },
    ]);

    await repository.rename(serialized.id, "Renamed game");
    expect((await repository.get(serialized.id)).name).toBe("Renamed game");
    expect((await repository.get(serialized.id)).payload.version).toBe(1);

    expect(await repository.delete(serialized.id)).toBe(true);
    expect(await repository.list()).toEqual([]);
  });
});
