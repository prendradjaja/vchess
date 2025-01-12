import { ChessRules, Move, PiPo } from "@/base_rules";
import { randInt } from "@/utils/alea";
import { ArrayFun } from "@/utils/array";

export class Pandemonium2Rules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      { },
      ChessRules.PawnSpecs,
      { promotions: [V.GILDING] }
    );
  }

  loseOnRepetition() {
    // If current side is under check: lost
    return this.underCheck(this.turn);
  }

  static get GILDING() {
    return "g";
  }

  static get SCEPTER() {
    return "s";
  }

  static get HORSE() {
    return "h";
  }

  static get DRAGON() {
    return "d";
  }

  static get CARDINAL() {
    return "c";
  }

  static get WHOLE() {
    return "w";
  }

  static get MARSHAL() {
    return "m";
  }

  static get APRICOT() {
    return "a";
  }

  static get PIECES() {
    return (
      ChessRules.PIECES.concat([
        V.GILDING, V.SCEPTER, V.HORSE, V.DRAGON,
        V.CARDINAL, V.WHOLE, V.MARSHAL, V.APRICOT])
    );
  }

  getPpath(b) {
    const prefix = (ChessRules.PIECES.includes(b[1]) ? "" : "Pandemonium/");
    return prefix + b;
  }

  static get size() {
    return { x: 8, y: 10};
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Sub-turn is useful only at first move...
    this.subTurn = 1;
    // Also init reserves (used by the interface to show landable pieces)
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        [V.PAWN]: reserve[0],
        [V.ROOK]: reserve[1],
        [V.KNIGHT]: reserve[2],
        [V.BISHOP]: reserve[3],
        [V.QUEEN]: reserve[4],
        [V.CARDINAL]: reserve[5],
        [V.MARSHAL]: reserve[6],
      },
      b: {
        [V.PAWN]: reserve[7],
        [V.ROOK]: reserve[8],
        [V.KNIGHT]: reserve[9],
        [V.BISHOP]: reserve[10],
        [V.QUEEN]: reserve[11],
        [V.CARDINAL]: reserve[12],
        [V.MARSHAL]: reserve[13]
      }
    };
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParsed = V.ParseFen(fen);
    // Check reserves
    if (!fenParsed.reserve || !fenParsed.reserve.match(/^[0-9]{14,14}$/))
      return false;
    return true;
  }

  static ParseFen(fen) {
    const fenParts = fen.split(" ");
    return Object.assign(
      ChessRules.ParseFen(fen),
      { reserve: fenParts[5] }
    );
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    let counts = new Array(14);
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      counts[i] = this.reserve["w"][V.RESERVE_PIECES[i]];
      counts[7 + i] = this.reserve["b"][V.RESERVE_PIECES[i]];
    }
    return counts.join("");
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0) {
      return (
        "rnbqkmcbnr/pppppppppp/91/91/91/91/PPPPPPPPPP/RNBQKMCBNR " +
        "w 0 ajaj - 00000000000000"
      );
    }

    let pieces = { w: new Array(10), b: new Array(10) };
    let flags = "";
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        flags += flags;
        break;
      }

      let positions = ArrayFun.range(10);

      // Get random squares for bishops (different colors)
      let randIndex = 2 * randInt(5);
      let bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * randInt(5) + 1;
      let bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      randIndex = randInt(8);
      let knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(7);
      let knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      randIndex = randInt(6);
      let queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Random squares for cardinal + marshal
      randIndex = randInt(5);
      let cardinalPos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(4);
      let marshalPos = positions[randIndex];
      positions.splice(randIndex, 1);

      let rook1Pos = positions[0];
      let kingPos = positions[1];
      let rook2Pos = positions[2];

      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][marshalPos] = "m";
      pieces[c][cardinalPos] = "c";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
      flags += V.CoordToColumn(rook1Pos) + V.CoordToColumn(rook2Pos);
    }
    return (
      pieces["b"].join("") +
      "/pppppppppp/91/91/91/91/91/91/PPPPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      " w 0 " + flags + " - 00000000000000"
    );
  }

  getReservePpath(index, color) {
    const p = V.RESERVE_PIECES[index];
    const prefix = (ChessRules.PIECES.includes(p) ? "" : "Pandemonium/");
    return prefix + color + p;;
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return (
      [V.PAWN, V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN, V.CARDINAL, V.MARSHAL]
    );
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    const bounds = (p == V.PAWN ? [1, V.size.x - 1] : [0, V.size.x]);
    let moves = [];
    for (let i = bounds[0]; i < bounds[1]; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y }, //a bit artificial...
            end: { x: i, y: j }
          });
          if (p == V.PAWN) {
            // Do not drop on checkmate:
            this.play(mv);
            const res = (
              this.underCheck(oppCol) && !this.atLeastOneMove("noReserve")
            );
            this.undo(mv);
            if (res) continue;
          }
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  static get PromoteMap() {
    return {
      r: 'd',
      n: 's',
      b: 'h',
      c: 'w',
      m: 'a'
    };
  }

  applyPromotions(moves, promoted) {
    const lastRank = (this.turn == 'w' ? 0 : V.size.x - 1);
    let promotions = [];
    moves.forEach(m => {
      if ([m.start.x, m.end.x].includes(lastRank)) {
        let pMove = JSON.parse(JSON.stringify(m));
        pMove.appear[0].p = promoted;
        promotions.push(pMove);
      }
    });
    Array.prototype.push.apply(moves, promotions);
  }

  getPotentialMovesFrom([x, y]) {
    const c = this.getColor(x, y);
    const oppCol = V.GetOppCol(c);
    if (this.movesCount <= 1) {
      if (this.kingPos[c][0] == x && this.kingPos[c][1] == y) {
        // Pass (if setup is ok)
        return [
          new Move({
            appear: [],
            vanish: [],
            start: { x: this.kingPos[c][0], y: this.kingPos[c][1] },
            end: { x: this.kingPos[oppCol][0], y: this.kingPos[oppCol][1] }
          })
        ];
      }
      const firstRank = (this.movesCount == 0 ? V.size.x - 1 : 0);
      if (x != firstRank || this.getPiece(x, y) != V.KNIGHT) return [];
      // Swap with who? search for matching bishop:
      let knights = [],
          bishops = [];
      for (let i = 0; i < V.size.y; i++) {
        const elt = this.board[x][i][1];
        if (elt == 'n') knights.push(i);
        else if (elt == 'b') bishops.push(i);
      }
      const destFile = (knights[0] == y ? bishops[0] : bishops[1]);
      return [
        new Move({
          appear: [
            new PiPo({
              x: x,
              y: destFile,
              c: c,
              p: V.KNIGHT
            }),
            new PiPo({
              x: x,
              y: y,
              c: c,
              p: V.BISHOP
            })
          ],
          vanish: [
            new PiPo({
              x: x,
              y: y,
              c: c,
              p: V.KNIGHT
            }),
            new PiPo({
              x: x,
              y: destFile,
              c: c,
              p: V.BISHOP
            })
          ],
          start: { x: x, y: y },
          end: { x: x, y: destFile }
        })
      ];
    }
    // Normal move (after initial setup)
    if (x >= V.size.x) return this.getReserveMoves([x, y]);
    const p = this.getPiece(x, y);
    const sq = [x, y];
    let moves = [];
    if (ChessRules.PIECES.includes(p))
      moves = super.getPotentialMovesFrom(sq);
    if ([V.GILDING, V.APRICOT, V.WHOLE].includes(p))
      moves = super.getPotentialQueenMoves(sq);
    switch (p) {
      case V.SCEPTER:
        moves = this.getPotentialScepterMoves(sq);
        break;
      case V.HORSE:
        moves = this.getPotentialHorseMoves(sq);
        break;
      case V.DRAGON:
        moves = this.getPotentialDragonMoves(sq);
        break;
      case V.CARDINAL:
        moves = this.getPotentialCardinalMoves(sq);
        break;
      case V.MARSHAL:
        moves = this.getPotentialMarshalMoves(sq);
        break;
    }
    // Maybe apply promotions:
    if (Object.keys(V.PromoteMap).includes(p))
      this.applyPromotions(moves, V.PromoteMap[p]);
    return moves;
  }

  getPotentialMarshalMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialCardinalMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep")
    );
  }

  getPotentialScepterMoves(sq) {
    const steps =
      V.steps[V.KNIGHT].concat(V.steps[V.BISHOP]).concat(V.steps[V.ROOK]);
    return this.getSlideNJumpMoves(sq, steps, "oneStep");
  }

  getPotentialHorseMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.ROOK], "oneStep"));
  }

  getPotentialDragonMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
      this.getSlideNJumpMoves(sq, V.steps[V.BISHOP], "oneStep"));
  }

  getPotentialKingMoves(sq) {
    // Initialize with normal moves
    let moves = this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
    const c = this.turn;
    if (
      this.castleFlags[c][0] < V.size.y ||
      this.castleFlags[c][1] < V.size.y
    ) {
      const finalSquares = [
        [1, 2],
        [7, 6]
      ];
      moves = moves.concat(super.getCastleMoves(sq, finalSquares));
    }
    return moves;
  }

  isAttacked(sq, color) {
    return (
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByKing(sq, color) ||
      this.isAttackedByQueens(sq, color) ||
      this.isAttackedByScepter(sq, color) ||
      this.isAttackedByDragon(sq, color) ||
      this.isAttackedByHorse(sq, color) ||
      this.isAttackedByMarshal(sq, color) ||
      this.isAttackedByCardinal(sq, color)
    );
  }

  isAttackedByQueens([x, y], color) {
    // pieces: because queen = gilding = whole = apricot
    const pieces = [V.QUEEN, V.GILDING, V.WHOLE, V.APRICOT];
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of steps) {
      let rx = x + step[0],
          ry = y + step[1];
      while (V.OnBoard(rx, ry) && this.board[rx][ry] == V.EMPTY) {
        rx += step[0];
        ry += step[1];
      }
      if (
        V.OnBoard(rx, ry) &&
        this.board[rx][ry] != V.EMPTY &&
        pieces.includes(this.getPiece(rx, ry)) &&
        this.getColor(rx, ry) == color
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByScepter(sq, color) {
    const steps =
      V.steps[V.KNIGHT].concat(V.steps[V.ROOK]).concat(V.steps[V.BISHOP]);
    return (
      super.isAttackedBySlideNJump(sq, color, V.SCEPTER, steps, "oneStep")
    );
  }

  isAttackedByHorse(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.HORSE, V.steps[V.BISHOP]) ||
      super.isAttackedBySlideNJump(
        sq, color, V.HORSE, V.steps[V.ROOK], "oneStep")
    );
  }

  isAttackedByDragon(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.DRAGON, V.steps[V.ROOK]) ||
      super.isAttackedBySlideNJump(
        sq, color, V.DRAGON, V.steps[V.BISHOP], "oneStep")
    );
  }

  isAttackedByMarshal(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.MARSHAL, V.steps[V.ROOK]) ||
      super.isAttackedBySlideNJump(
        sq,
        color,
        V.MARSHAL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  isAttackedByCardinal(sq, color) {
    return (
      super.isAttackedBySlideNJump(sq, color, V.CARDINAL, V.steps[V.BISHOP]) ||
      super.isAttackedBySlideNJump(
        sq,
        color,
        V.CARDINAL,
        V.steps[V.KNIGHT],
        "oneStep"
      )
    );
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    if (this.movesCount >= 2) {
      const color = this.turn;
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        moves = moves.concat(
          this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
        );
      }
    }
    return this.filterValid(moves);
  }

  atLeastOneMove(noReserve) {
    if (!super.atLeastOneMove()) {
      if (!noReserve) {
        // Search one reserve move
        for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
          let moves = this.filterValid(
            this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
          );
          if (moves.length > 0) return true;
        }
      }
      return false;
    }
    return true;
  }

  // Reverse 'PromoteMap'
  static get P_CORRESPONDANCES() {
    return {
      d: 'r',
      s: 'n',
      h: 'b',
      w: 'c',
      a: 'm',
      g: 'p'
    };
  }

  static MayDecode(piece) {
    if (Object.keys(V.P_CORRESPONDANCES).includes(piece))
      return V.P_CORRESPONDANCES[piece];
    return piece;
  }

  play(move) {
    move.subTurn = this.subTurn; //much easier
    if (this.movesCount >= 2 || this.subTurn == 2 || move.vanish.length == 0) {
      this.turn = V.GetOppCol(this.turn);
      this.subTurn = 1;
      this.movesCount++;
    }
    else this.subTurn = 2;
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.vanish.length == 0 && move.appear.length == 0) return;
    super.postPlay(move);
    const color = move.appear[0].c;
    if (move.vanish.length == 0)
      // Drop unpromoted piece:
      this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2 && move.appear.length == 1)
      // May capture a promoted piece:
      this.reserve[color][V.MayDecode(move.vanish[1].p)]++;
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.movesCount >= 2 || this.subTurn == 1 || move.vanish.length == 0) {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount--;
    }
    this.subTurn = move.subTurn;
    this.postUndo(move);
  }

  postUndo(move) {
    if (move.vanish.length == 0 && move.appear.length == 0) return;
    super.postUndo(move);
    const color = move.appear[0].c;
    if (move.vanish.length == 0)
      this.reserve[color][move.appear[0].p]++;
    else if (move.vanish.length == 2 && move.appear.length == 1)
      this.reserve[color][V.MayDecode(move.vanish[1].p)]--;
  }

  static get VALUES() {
    return Object.assign(
      {},
      ChessRules.VALUES,
      {
        n: 2.5, //knight is weaker
        g: 9,
        s: 5,
        h: 6,
        d: 7,
        c: 7,
        w: 9,
        m: 8,
        a: 9
      }
    );
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  getComputerMove() {
    if (this.movesCount <= 1) {
      // Special case: swap and pass at random
      const moves1 = this.getAllValidMoves();
      const m1 = moves1[randInt(moves1.length)];
      this.play(m1);
      if (m1.vanish.length == 0) {
        this.undo(m1);
        return m1;
      }
      const moves2 = this.getAllValidMoves();
      const m2 = moves2[randInt(moves2.length)];
      this.undo(m1);
      return [m1, m2];
    }
    return super.getComputerMove();
  }

  evalPosition() {
    let evaluation = super.evalPosition();
    // Add reserves:
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      const p = V.RESERVE_PIECES[i];
      evaluation += this.reserve["w"][p] * V.VALUES[p];
      evaluation -= this.reserve["b"][p] * V.VALUES[p];
    }
    return evaluation;
  }

  getNotation(move) {
    if (move.vanish.length == 0) {
      if (move.appear.length == 0) return "pass";
      const pieceName =
        (move.appear[0].p == V.PAWN ? "" : move.appear[0].p.toUpperCase());
      return pieceName + "@" + V.CoordsToSquare(move.end);
    }
    if (move.appear.length == 2) {
      if (move.appear[0].p != V.KING)
        return V.CoordsToSquare(move.start) + "S" + V.CoordsToSquare(move.end);
      return (move.end.y < move.start.y ? "0-0" : "0-0-0");
    }
    let notation = super.getNotation(move);
    if (move.vanish[0].p != V.PAWN && move.appear[0].p != move.vanish[0].p)
      // Add promotion indication:
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }

};
