import Matter from "matter-js";
import { CoinObj } from "./game/GameStateManager";

// Helper function to calculate striker position on threshold line
export const getStrikerPositionOnLine = (
  position: number, // 0-1 range
  playerSide: "bottom" | "top" | "left" | "right",
  boardOffsetX: number,
  boardOffsetY: number,
  boardSize: number
) => {
  const usableLength = boardSize - 260; // 130px margin on each side

  switch (playerSide) {
    case "bottom":
      return {
        x: boardOffsetX + 130 + position * usableLength,
        y: boardOffsetY + boardSize - 80,
      };
    case "top":
      return {
        x: boardOffsetX + 130 + usableLength + position * -1 * usableLength,
        y: boardOffsetY + 100 - 20,
      };
    case "left":
      return {
        x: boardOffsetX + 100,
        y: boardOffsetY + 130 + position * usableLength,
      };
    case "right":
      return {
        x: boardOffsetX + boardSize - 100,
        y: boardOffsetY + 130 + position * usableLength,
      };
  }
};

// Helper function to check if a point is near a threshold line
export const isOnThresholdLine = (
  x: number,
  y: number,
  boardOffsetX: number,
  boardOffsetY: number,
  boardSize: number
) => {
  const thresholdOffset = 60;
  const tolerance = 30;

  // Left line
  const leftLineX = boardOffsetX + boardOffsetX / 2;
  if (
    Math.abs(x - leftLineX) < tolerance &&
    y > boardOffsetY + boardOffsetY / 2 + thresholdOffset / 2 &&
    y < boardOffsetY + boardSize - boardOffsetY / 2
  ) {
    return { type: "left", x: leftLineX, y };
  }

  // Right line
  const rightLineX = boardOffsetX + boardSize - boardOffsetX / 2;
  if (
    Math.abs(x - rightLineX) < tolerance &&
    y > boardOffsetY + boardOffsetY / 2 + thresholdOffset / 2 &&
    y < boardOffsetY + boardSize - boardOffsetY / 2
  ) {
    return { type: "right", x: rightLineX, y };
  }

  // Top line
  const topLineY = boardOffsetY + boardOffsetY / 2;
  if (
    Math.abs(y - topLineY) < tolerance &&
    x > boardOffsetX + boardOffsetX / 2 + thresholdOffset / 2 &&
    x < boardOffsetX + boardSize - boardOffsetX / 2
  ) {
    return { type: "top", x, y: topLineY };
  }

  // Bottom line
  const bottomLineY = boardOffsetY + boardSize - boardOffsetY / 2;
  if (
    Math.abs(y - bottomLineY) < tolerance &&
    x > boardOffsetX + boardOffsetX / 2 + thresholdOffset / 2 &&
    x < boardOffsetX + boardSize - boardOffsetX / 2
  ) {
    return { type: "bottom", x, y: bottomLineY };
  }

  return null;
};

// Helper function to find striker at position
export const findStrikerAtPosition = (
  x: number,
  y: number,
  coins: CoinObj[]
) => {
  return coins.find((coinObj) => {
    if (coinObj.type === "striker") {
      const dx = coinObj.body.position.x - x;
      const dy = coinObj.body.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= 20; // 15 radius + 5 tolerance
    }
    return false;
  });
};

// Calculate striker velocity
export const calculateStrikerVelocity = (
  dx: number,
  dy: number,
  distance: number
) => {
  if (distance <= 10) return { x: 0, y: 0 };

  // Calculate velocity (opposite to drag direction) - much more powerful
  const maxPower = 100; // Increased power
  const powerMultiplier = distance / 30; // More sensitive to drag distance
  const power = Math.min(powerMultiplier, maxPower);
  const velocityX = -(dx / distance) * power * 4.5;
  const velocityY = -(dy / distance) * power * 4.5;

  console.log("Shooting with power:", {
    distance,
    power,
    velocityX,
    velocityY,
  });
  return { x: velocityX, y: velocityY };
};

// Create game physics bodies
export const createGameBodies = (
  boardOffsetX: number,
  boardOffsetY: number,
  boardSize: number
) => {
  const WALL_THICKNESS = 20;
  const POCKET_RADIUS = 25;

  // Create board walls (visible walls)
  const boardWalls = [
    // Top wall - positioned at the top edge of the board
    Matter.Bodies.rectangle(
      boardOffsetX + boardSize / 2,
      boardOffsetY - WALL_THICKNESS / 2,
      boardSize - POCKET_RADIUS * 2,
      WALL_THICKNESS,
      { isStatic: true, restitution: 0.9, friction: 0.1 }
    ),
    // Bottom wall - positioned at the bottom edge of the board
    Matter.Bodies.rectangle(
      boardOffsetX + boardSize / 2,
      boardOffsetY + boardSize + WALL_THICKNESS / 2,
      boardSize - POCKET_RADIUS * 2,
      WALL_THICKNESS,
      { isStatic: true, restitution: 0.9, friction: 0.1 }
    ),
    // Left wall - positioned at the left edge of the board
    Matter.Bodies.rectangle(
      boardOffsetX - WALL_THICKNESS / 2,
      boardOffsetY + boardSize / 2,
      WALL_THICKNESS,
      boardSize - POCKET_RADIUS * 2,
      { isStatic: true, restitution: 0.9, friction: 0.1 }
    ),
    // Right wall - positioned at the right edge of the board
    Matter.Bodies.rectangle(
      boardOffsetX + boardSize + WALL_THICKNESS / 2,
      boardOffsetY + boardSize / 2,
      WALL_THICKNESS,
      boardSize - POCKET_RADIUS * 2,
      { isStatic: true, restitution: 0.9, friction: 0.1 }
    ),
  ];

  // Create invisible boundary walls around the entire canvas area
  const canvasSize = 800; // Canvas size (updated to match new canvas dimensions)
  const boundaryWalls = [
    // Top boundary
    Matter.Bodies.rectangle(canvasSize / 2, -25, canvasSize, 50, {
      isStatic: true,
      restitution: 0.8,
      friction: 0.1,
      render: { visible: false },
    }),
    // Bottom boundary
    Matter.Bodies.rectangle(canvasSize / 2, canvasSize + 25, canvasSize, 50, {
      isStatic: true,
      restitution: 0.8,
      friction: 0.1,
      render: { visible: false },
    }),
    // Left boundary
    Matter.Bodies.rectangle(-25, canvasSize / 2, 50, canvasSize, {
      isStatic: true,
      restitution: 0.8,
      friction: 0.1,
      render: { visible: false },
    }),
    // Right boundary
    Matter.Bodies.rectangle(canvasSize + 25, canvasSize / 2, 50, canvasSize, {
      isStatic: true,
      restitution: 0.8,
      friction: 0.1,
      render: { visible: false },
    }),
  ];

  // Create corner pockets with inner sensors for more accurate detection
  const INNER_SENSOR_RADIUS = 12; // Smaller radius for precise detection

  const pockets = [
    // Top-left pocket
    Matter.Bodies.circle(boardOffsetX, boardOffsetY, POCKET_RADIUS, {
      isStatic: true,
      isSensor: true,
      render: { fillStyle: "#000" },
    }),
    // Top-right pocket
    Matter.Bodies.circle(
      boardOffsetX + boardSize,
      boardOffsetY,
      POCKET_RADIUS,
      {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: "#000" },
      }
    ),
    // Bottom-left pocket
    Matter.Bodies.circle(
      boardOffsetX,
      boardOffsetY + boardSize,
      POCKET_RADIUS,
      {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: "#000" },
      }
    ),
    // Bottom-right pocket
    Matter.Bodies.circle(
      boardOffsetX + boardSize,
      boardOffsetY + boardSize,
      POCKET_RADIUS,
      {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: "#000" },
      }
    ),
  ];

  // Create smaller sensor bodies inside each pocket for more accurate detection
  const pocketSensors = pockets.map((pocket, index) => {
    const sensorRadius = POCKET_RADIUS * 0.6; // Smaller radius for more accurate detection
    return Matter.Bodies.circle(
      pocket.position.x,
      pocket.position.y,
      sensorRadius,
      {
        isSensor: true,
        isStatic: true,
        render: { visible: false },
      }
    );
  });

  // Create invisible walls around each pocket to prevent coins from flying out
  // Only create walls on the outer edges, leaving the entrance from the board center open
  const pocketWalls: Matter.Body[] = [];
  const wallThickness = 10;
  const wallLength = POCKET_RADIUS * 1.5;

  pockets.forEach((pocket, index) => {
    const pos = pocket.position;
    if (index === 0) {
      // Top-left corner pocket
      // Left wall (outer edge) - blocks exit to left
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x - POCKET_RADIUS - wallThickness / 2,
          pos.y,
          wallThickness,
          wallLength,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
      // Top wall (outer edge) - blocks exit upward
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x,
          pos.y - POCKET_RADIUS - wallThickness / 2,
          wallLength,
          wallThickness,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
    } else if (index === 1) {
      // Top-right corner pocket
      // Right wall (outer edge) - blocks exit to right
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x + POCKET_RADIUS + wallThickness / 2,
          pos.y,
          wallThickness,
          wallLength,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
      // Top wall (outer edge) - blocks exit upward
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x,
          pos.y - POCKET_RADIUS - wallThickness / 2,
          wallLength,
          wallThickness,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
    } else if (index === 2) {
      // Bottom-left corner pocket
      // Left wall (outer edge) - blocks exit to left
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x - POCKET_RADIUS - wallThickness / 2,
          pos.y,
          wallThickness,
          wallLength,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
      // Bottom wall (outer edge) - blocks exit downward
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x,
          pos.y + POCKET_RADIUS + wallThickness / 2,
          wallLength,
          wallThickness,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
    } else if (index === 3) {
      // Bottom-right corner pocket
      // Right wall (outer edge) - blocks exit to right
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x + POCKET_RADIUS + wallThickness / 2,
          pos.y,
          wallThickness,
          wallLength,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
      // Bottom wall (outer edge) - blocks exit downward
      pocketWalls.push(
        Matter.Bodies.rectangle(
          pos.x,
          pos.y + POCKET_RADIUS + wallThickness / 2,
          wallLength,
          wallThickness,
          {
            isStatic: true,
            render: { visible: false },
            restitution: 0.3,
            friction: 0.8,
          }
        )
      );
    }
  });

  return {
    walls: [...boardWalls, ...boundaryWalls, ...pocketWalls],
    pockets,
    pocketSensors,
    pocketWalls,
    POCKET_RADIUS,
  };

  return {
    walls: [...boardWalls, ...boundaryWalls],
    pockets,
    pocketSensors,
    POCKET_RADIUS,
  };
};
