import {
  Board3D,
  Coordinate3D,
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";

const VALUES = { pawn: 100, knight: 320, bishop: 340, rook: 500, queen: 900, king: 20000 };
let generation = 0;

function createBoard(pieces) {
  return new Board3D(
    pieces.map((piece) => ({
      id: piece.id,
      type: piece.type,
      color: piece.color,
      position: new Coordinate3D(piece.position.x, piece.position.y, piece.position.z),
      hasMoved: Boolean(piece.hasMoved),
    })),
  );
}

function opposite(color) {
  return color === "white" ? "black" : "white";
}

function evaluate(board, perspective) {
  let score = 0;
  for (const piece of board.getAllPieces()) {
    const centerDistance =
      Math.abs(piece.position.x - 3.5) +
      Math.abs(piece.position.y - 3.5) +
      Math.abs(piece.position.z - 3.5);
    const value = VALUES[piece.type] + Math.round((10.5 - centerDistance) * 2);
    score += piece.color === perspective ? value : -value;
  }
  return score;
}

function search(board, side, rootSide, depth, alpha, beta, deadline, token) {
  if (performance.now() >= deadline || token !== generation) {
    return evaluate(board, rootSide);
  }
  const status = evaluatePosition(board, side);
  if (status.kind === "checkmate") {
    return status.winner === rootSide ? 100000 + depth : -100000 - depth;
  }
  if (status.kind === "stalemate") return 0;
  if (depth <= 0) return evaluate(board, rootSide);

  const moves = generateLegalMovesForColor(board, side).sort((left, right) => {
    const leftCapture = left.capturedPieceId ? 1 : 0;
    const rightCapture = right.capturedPieceId ? 1 : 0;
    return rightCapture - leftCapture;
  });
  const maximizing = side === rootSide;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = board.clone();
    next.applyMove(move);
    const value = search(
      next,
      opposite(side),
      rootSide,
      depth - 1,
      alpha,
      beta,
      deadline,
      token,
    );
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha || performance.now() >= deadline || token !== generation) break;
  }
  return Number.isFinite(best) ? best : evaluate(board, rootSide);
}

function serializeMove(move) {
  return {
    pieceId: move.pieceId,
    from: { x: move.from.x, y: move.from.y, z: move.from.z, square3D: move.from.toSquareAddress() },
    to: { x: move.to.x, y: move.to.y, z: move.to.z, square3D: move.to.toSquareAddress() },
    square3D: move.to.toSquareAddress(),
    kind: move.kind,
    capturedPieceId: move.capturedPieceId ?? null,
  };
}

function chooseMove(pieces, sideToMove, difficulty, token) {
  const board = createBoard(pieces);
  const moves = generateLegalMovesForColor(board, sideToMove);
  if (!moves.length) return null;
  const limits = {
    easy: { depth: 0, milliseconds: 80 },
    medium: { depth: 1, milliseconds: 350 },
    hard: { depth: 2, milliseconds: 1100 },
  };
  const limit = limits[difficulty] ?? limits.easy;
  const deadline = performance.now() + limit.milliseconds;
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    if (performance.now() >= deadline || token !== generation) break;
    const next = board.clone();
    const result = next.applyMove(move);
    let score = search(
      next,
      opposite(sideToMove),
      sideToMove,
      limit.depth,
      -Infinity,
      Infinity,
      deadline,
      token,
    );
    if (result.capturedPiece) score += VALUES[result.capturedPiece.type] * 0.12;
    if (move.to.z > move.from.z) score += 8;
    const tieBreak = move.to.toSquareAddress().localeCompare(bestMove.to.toSquareAddress());
    if (score > bestScore || (score === bestScore && tieBreak < 0)) {
      bestScore = score;
      bestMove = move;
    }
  }
  return serializeMove(bestMove);
}

self.addEventListener("message", (event) => {
  if (event.data.type === "cancel") {
    generation += 1;
    return;
  }
  if (event.data.type !== "choose-move") return;
  const token = generation;
  const move = chooseMove(
    event.data.pieces,
    event.data.sideToMove,
    event.data.difficulty,
    token,
  );
  self.postMessage({ requestId: event.data.requestId, move });
});
