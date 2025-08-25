import { useState, useCallback } from 'react';

export interface Score {
  black: number;
  white: number;
  queen: number;
  total: number;
}

export interface ScoreManagerProps {
  onScoreUpdate?: (score: Score) => void;
}

export const useScoreManager = ({ onScoreUpdate }: ScoreManagerProps = {}) => {
  const [score, setScore] = useState<Score>({
    black: 0,
    white: 0,
    queen: 0,
    total: 0
  });

  const addPoints = useCallback((coinType: 'black' | 'white' | 'queen') => {
    const points = getPointsForCoin(coinType);
    
    setScore(prevScore => {
      const newScore = {
        ...prevScore,
        [coinType]: prevScore[coinType] + 1,
        total: prevScore.total + points
      };
      
      onScoreUpdate?.(newScore);
      return newScore;
    });

    return points;
  }, [onScoreUpdate]);

  const resetScore = useCallback(() => {
    const resetScore = { black: 0, white: 0, queen: 0, total: 0 };
    setScore(resetScore);
    onScoreUpdate?.(resetScore);
  }, [onScoreUpdate]);

  return {
    score,
    addPoints,
    resetScore
  };
};

export const getPointsForCoin = (coinType: 'black' | 'white' | 'queen'): number => {
  switch (coinType) {
    case 'black':
      return 10;
    case 'white':
      return 20;
    case 'queen':
      return 50;
    default:
      return 0;
  }
};

export const ScoreDisplay = ({ score }: { score: Score }) => {
  return (
    <div className="bg-white bg-opacity-90 rounded-lg p-3 shadow-lg border-2 border-gray-300">
      <h3 className="text-lg font-bold mb-2 text-center">Score</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-800 border border-gray-600"></div>
            Black ({score.black})
          </span>
          <span className="font-medium">{score.black * 10}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white border border-gray-400"></div>
            White ({score.white})
          </span>
          <span className="font-medium">{score.white * 20}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-pink-500 border border-pink-600"></div>
            Queen ({score.queen})
          </span>
          <span className="font-medium">{score.queen * 50}</span>
        </div>
        <div className="border-t pt-1 mt-2">
          <div className="flex justify-between items-center font-bold">
            <span>Total</span>
            <span>{score.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
