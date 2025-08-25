import Matter from "matter-js";
import { CoinObj } from "./game/GameStateManager";

interface CarromCoinsProps {
  ctx: CanvasRenderingContext2D;
  coins: CoinObj[];
}

export const drawCarromCoins = ({ ctx, coins }: CarromCoinsProps) => {
  coins.forEach((coinObj) => {
    const coin = coinObj.body;
    const type = coinObj.type;

    ctx.beginPath();
    const radius = type === "striker" ? 15 : 12;
    ctx.arc(coin.position.x, coin.position.y, radius, 0, 2 * Math.PI);

    // Set color based on coin type
    switch (type) {
      case "white":
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#CCCCCC";
        break;
      case "black":
        ctx.fillStyle = "#2C2C2C";
        ctx.strokeStyle = "#000000";
        break;
      case "queen":
        ctx.fillStyle = "#FF1493"; // Deep pink/red
        ctx.strokeStyle = "#DC143C";
        break;
      case "striker":
        ctx.fillStyle = "#FFD700"; // Gold
        ctx.strokeStyle = "#B8860B";
        break;
    }

    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add a small highlight for better visibility
    if (type !== "black") {
      ctx.beginPath();
      ctx.arc(
        coin.position.x - 3,
        coin.position.y - 3,
        radius * 0.3,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();
    }
  });
};

export const createCarromCoins = (
  centerX: number,
  centerY: number,
  coinRadius: number
): CoinObj[] => {
  // Create the queen (red/pink coin) at the center
  const queen = Matter.Bodies.circle(centerX, centerY, coinRadius, {
    restitution: 0.6,
    friction: 0.4,
    frictionAir: 0.025,
    density: 0.002,
  });

  const coins: CoinObj[] = [];

  // Add queen first
  coins.push({ body: queen, type: "queen" });

  // Create hexagonal arrangement around the queen
  const arrangements = [
    // Inner ring (6 coins around queen)
    { distance: 30, count: 6, startColor: "white" },
    // Outer ring (12 coins)
    { distance: 55, count: 12, startColor: "black" },
  ];

  let whiteCount = 0;
  let blackCount = 0;

  arrangements.forEach(({ distance, count, startColor }) => {
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      const coinBody = Matter.Bodies.circle(x, y, coinRadius, {
        restitution: 0.6,
        friction: 0.4,
        frictionAir: 0.025,
        density: 0.002,
      });

      // Alternate colors, but ensure we get 9 of each
      let coinType: "white" | "black";
      if (startColor === "white") {
        coinType =
          whiteCount < 9 && (i % 2 === 0 || blackCount >= 9)
            ? "white"
            : "black";
      } else {
        coinType =
          blackCount < 9 && (i % 2 === 0 || whiteCount >= 9)
            ? "black"
            : "white";
      }

      if (coinType === "white") whiteCount++;
      else blackCount++;

      coins.push({ body: coinBody, type: coinType });
    }
  });

  return coins;
};
