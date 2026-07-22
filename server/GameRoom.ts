import {
  Board3D,
  Coordinate3D,
  evaluatePosition,
  generateLegalMovesForPiece,
  type Move,
  type Piece,
  type PieceColor,
} from "../src/engine3d/index.js";

const BACK_RANK: readonly Piece["type"][] = [
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
  "bishop",
  "knight",
  "rook",
];

function initialPieces(): Piece[] {
  const pieces: Piece[] = [];
  for (let x = 0; x < 8; x += 1) {
    pieces.push(
      { id: `white-${BACK_RANK[x]}-${x + 1}`, type: BACK_RANK[x]!, color: "white", position: new Coordinate3D(x, 0, 0), hasMoved: false },
      { id: `white-pawn-${x + 1}`, type: "pawn", color: "white", position: new Coordinate3D(x, 1, 0), hasMoved: false },
      { id: `black-pawn-${x + 1}`, type: "pawn", color: "black", position: new Coordinate3D(x, 6, 0), hasMoved: false },
      { id: `black-${BACK_RANK[x]}-${x + 1}`, type: BACK_RANK[x]!, color: "black", position: new Coordinate3D(x, 7, 0), hasMoved: false },
    );
  }
  return pieces;
}

function other(color: PieceColor): PieceColor {
  return color === "white" ? "black" : "white";
}

export type PlayerRole = PieceColor | "spectator";

export interface MoveIntent {
  pieceId: string;
  square3D: string;
}

export class GameRoom {
  public readonly board = new Board3D(initialPieces());
  public readonly players = new Map<PieceColor, string>();
  public sideToMove: PieceColor = "white";
  public sequence = 0;

  public join(playerId: string): PlayerRole {
    for (const [role, existingId] of this.players) {
      if (existingId === playerId) return role;
    }
    if (!this.players.has("white")) {
      this.players.set("white", playerId);
      return "white";
    }
    if (!this.players.has("black")) {
      this.players.set("black", playerId);
      return "black";
    }
    return "spectator";
  }

  public applyIntent(playerId: string, sequence: number, intent: MoveIntent): Move {
    if (sequence !== this.sequence + 1) {
      throw new Error(`Expected sequence ${this.sequence + 1}`);
    }
    if (this.players.get(this.sideToMove) !== playerId) {
      throw new Error(`It is ${this.sideToMove}'s turn`);
    }
    const piece = this.board
      .getAllPieces()
      .find((candidate) => candidate.id === intent.pieceId);
    if (!piece || piece.color !== this.sideToMove) {
      throw new Error("Piece does not belong to the active player");
    }
    const move = generateLegalMovesForPiece(this.board, piece).find(
      (candidate) => candidate.to.toSquareAddress() === intent.square3D,
    );
    if (!move) throw new Error("Move is not legal in the authoritative position");
    this.board.applyMove(move);
    this.sequence = sequence;
    this.sideToMove = other(this.sideToMove);
    return move;
  }

  public snapshot() {
    return {
      sequence: this.sequence,
      sideToMove: this.sideToMove,
      status: evaluatePosition(this.board, this.sideToMove),
      pieces: this.board.getAllPieces().map((piece) => ({
        ...piece,
        position: {
          x: piece.position.x,
          y: piece.position.y,
          z: piece.position.z,
          square3D: piece.position.toSquareAddress(),
        },
      })),
    };
  }
}
