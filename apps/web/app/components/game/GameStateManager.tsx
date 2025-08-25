import { useRef, useCallback } from "react";
import Matter from "matter-js";

export interface CoinObj {
  body: Matter.Body;
  type: "white" | "black" | "queen" | "striker";
}

export interface GameStateManagerProps {
  onAllStopped?: () => void;
  onCoinPocketed?: (coinType: "black" | "white" | "queen" | "striker") => void;
  velocityThreshold?: number;
}

export const useGameStateManager = ({
  onAllStopped,
  onCoinPocketed,
  velocityThreshold = 0.5,
}: GameStateManagerProps = {}) => {
  const lastStoppedCheckRef = useRef<number>(0);
  const hasStoppedRef = useRef<boolean>(false);

  // Check if all bodies have stopped moving
  const checkAllStopped = useCallback(
    (coins: CoinObj[]) => {
      const now = Date.now();

      // Throttle the check to every 100ms
      if (now - lastStoppedCheckRef.current < 100) {
        return false;
      }

      lastStoppedCheckRef.current = now;

      const allStopped = coins.every((coin) => {
        const velocity = coin.body.velocity;
        const speed = Math.sqrt(
          velocity.x * velocity.x + velocity.y * velocity.y
        );
        return speed < velocityThreshold;
      });

      // Only trigger once when transitioning from moving to stopped
      if (allStopped && !hasStoppedRef.current) {
        hasStoppedRef.current = true;
        onAllStopped?.();
        return true;
      } else if (!allStopped) {
        hasStoppedRef.current = false;
      }

      return allStopped;
    },
    [onAllStopped, velocityThreshold]
  );

  // Handle coin pocketing
  const handleCoinPocketed = useCallback(
    (coin: Matter.Body, coins: CoinObj[]) => {
      const coinObj = coins.find((c) => c.body === coin);
      if (coinObj && coinObj.type !== "striker") {
        onCoinPocketed?.(coinObj.type as "black" | "white" | "queen");
      } else if (coinObj && coinObj.type === "striker") {
        onCoinPocketed?.("striker");
      }
    },
    [onCoinPocketed]
  );

  // Reset striker position
  const resetStriker = useCallback(
    (
      coins: CoinObj[],
      gameObjects: any,
      strikerPosition: number = 50 // Default to center position
    ) => {
      const striker = coins.find((coin) => coin.type === "striker");
      if (!striker || !gameObjects.BOARD_OFFSET_X) return;

      const { BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_SIZE } = gameObjects;

      // Calculate center position on bottom threshold line
      const thresholdOffset = 60;
      const usableLength = BOARD_SIZE - BOARD_OFFSET_X - thresholdOffset;
      const position = strikerPosition / 100; // Convert to 0-1 range

      const newPos = {
        x:
          BOARD_OFFSET_X +
          BOARD_OFFSET_X / 2 +
          thresholdOffset / 2 +
          position * usableLength,
        y: BOARD_OFFSET_Y + BOARD_SIZE - BOARD_OFFSET_Y / 2,
      };

      // Reset striker position and velocity
      Matter.Body.setPosition(striker.body, newPos);
      Matter.Body.setVelocity(striker.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(striker.body, 0);

      console.log("Striker reset to center position:", newPos);
    },
    []
  );

  return {
    checkAllStopped,
    handleCoinPocketed,
    resetStriker,
  };
};
