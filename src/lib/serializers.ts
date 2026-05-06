import { Artwork, Game } from "@prisma/client";

type GameWithArt = Game & { artworks: Artwork[] };

export function serializeGame(game: GameWithArt) {
  return {
    ...game,
    fileSizeBytes: game.fileSizeBytes ? game.fileSizeBytes.toString() : null,
  };
}
