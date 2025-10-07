import { useState, useCallback } from "react";

export interface PlayerScore {
  black: number;
  white: number;
  queen: number;
  total: number;
}

export interface GameScore {
  player1: PlayerScore;
  player2: PlayerScore;
  currentWinner: string | null;
  gameWon: boolean;
}

export interface ScoreManagerProps {
  onScoreUpdate?: (gameScore: GameScore) => void;
  onGameWon?: (winner: string, finalScore: GameScore) => void;
}

const WIN_CONDITION = 50;

export const useScoreManager = ({
  onScoreUpdate,
  onGameWon,
}: ScoreManagerProps = {}) => {
  const [gameScore, setGameScore] = useState<GameScore>({
    player1: { black: 0, white: 0, queen: 0, total: 0 },
    player2: { black: 0, white: 0, queen: 0, total: 0 },
    currentWinner: null,
    gameWon: false,
  });

  const addPoints = useCallback(
    (coinType: "black" | "white" | "queen", isPlayer1: boolean) => {
      const points = getPointsForCoin(coinType);

      setGameScore((prevScore) => {
        const playerKey = isPlayer1 ? "player1" : "player2";
        const player = prevScore[playerKey];

        const updatedPlayer = {
          ...player,
          [coinType]: player[coinType] + 1,
          total: player.total + points,
        };

        const newGameScore = {
          ...prevScore,
          [playerKey]: updatedPlayer,
        };

        // Check win condition
        let winner = null;
        let gameWon = false;

        if (updatedPlayer.total >= WIN_CONDITION) {
          winner = isPlayer1 ? "Player 1" : "Player 2";
          gameWon = true;
          newGameScore.currentWinner = winner;
          newGameScore.gameWon = true;
        }

        onScoreUpdate?.(newGameScore);

        if (gameWon && winner) {
          onGameWon?.(winner, newGameScore);
        }

        return newGameScore;
      });

      return points;
    },
    [onScoreUpdate, onGameWon]
  );

  const resetScore = useCallback(() => {
    const resetGameScore: GameScore = {
      player1: { black: 0, white: 0, queen: 0, total: 0 },
      player2: { black: 0, white: 0, queen: 0, total: 0 },
      currentWinner: null,
      gameWon: false,
    };
    setGameScore(resetGameScore);
    onScoreUpdate?.(resetGameScore);
  }, [onScoreUpdate]);

  const syncScore = useCallback((externalScore: GameScore) => {
    setGameScore(externalScore);
  }, []);

  return {
    gameScore,
    addPoints,
    resetScore,
    syncScore,
  };
};

export const getPointsForCoin = (
  coinType: "black" | "white" | "queen"
): number => {
  switch (coinType) {
    case "black":
      return 10;
    case "white":
      return 20;
    case "queen":
      return 50;
    default:
      return 0;
  }
};

interface ScoreDisplayProps {
  gameScore: GameScore;
  player1Name?: string;
  player2Name?: string;
}

export const ScoreDisplay = ({
  gameScore,
  player1Name = "Player 1",
  player2Name = "Player 2",
}: ScoreDisplayProps) => {
  const { player1, player2, currentWinner, gameWon } = gameScore;

  return (
    <div className="bg-white bg-opacity-90 rounded-lg p-4 shadow-lg border-2 border-gray-300 min-w-[280px]">
      <h3 className="text-lg font-bold mb-3 text-center text-black">
        Score Board
        {gameWon && (
          <div className="text-lg text-green-600 font-bold mt-2 animate-pulse">
            🏆 {currentWinner} Wins! 🏆
            <div className="text-sm font-normal text-gray-600 mt-1">
              Returning to home in 3 seconds...
            </div>
          </div>
        )}
      </h3>

      {/* Player 1 Score */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">{player1Name}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-black">
              <div className="w-3 h-3 rounded-full bg-gray-800"></div>
              Black ({player1.black})
            </span>
            <span className="text-black">{player1.black * 10}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-black">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-400"></div>
              White ({player1.white})
            </span>
            <span className="text-black">{player1.white * 20}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-black">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              Queen ({player1.queen})
            </span>
            <span className="text-black">{player1.queen * 50}</span>
          </div>
          <div className="border-t pt-1 font-semibold border-black">
            <div className="flex justify-between">
              <span className="text-black">Total</span>
              <span
                className={`${player1.total >= WIN_CONDITION ? "text-green-600" : "text-black"}`}
              >
                {player1.total}/160
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Player 2 Score */}
      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
        <h4 className="font-semibold text-red-800 mb-2">{player2Name}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-black">
              <div className="w-3 h-3 rounded-full bg-gray-800"></div>
              Black ({player2.black})
            </span>
            <span className="text-black">{player2.black * 10}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-black">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-400"></div>
              White ({player2.white})
            </span>
            <span className="text-black">{player2.white * 20}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-black">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              Queen ({player2.queen})
            </span>
            <span className="text-black">{player2.queen * 50}</span>
          </div>
          <div className="border-t pt-1 font-semibold border-black">
            <div className="flex justify-between">
              <span className="text-black">Total</span>
              <span
                className={`${player2.total >= WIN_CONDITION ? "text-green-600" : "text-black"}`}
              >
                {player2.total}/160
              </span>
            </div>
          </div>
        </div>
      </div>

      {!gameWon && (
        <div className="mt-3 text-xs text-gray-600 text-center">
          First to 160 points wins!
        </div>
      )}
    </div>
  );
};
