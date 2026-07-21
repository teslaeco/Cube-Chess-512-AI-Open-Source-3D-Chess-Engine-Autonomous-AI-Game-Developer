export type Color = "white" | "black";
export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

export interface Coord3 {
  readonly x: number; // file a-h => 0-7
  readonly y: number; // rank 1-8 => 0-7
  readonly z: number; // level 1-8 => 0-7
}

export interface Piece {
  readonly id: string;
  readonly color: Color;
  readonly type: PieceType;
  readonly position: Coord3;
  readonly hasMoved: boolean;
}

export interface Move {
  readonly pieceId: string;
  readonly from: Coord3;
  readonly to: Coord3;
  readonly capturedPieceId?: string;
  readonly promotion?: Exclude<PieceType, "king" | "pawn">;
}

export interface Position {
  readonly sideToMove: Color;
  readonly pieces: ReadonlyMap<string, Piece>;
}
