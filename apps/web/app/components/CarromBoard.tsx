import { RefObject } from "react";
import Matter from "matter-js";

interface CarromBoardProps {
  ctx: CanvasRenderingContext2D;
  boardOffset: { x: number; y: number };
  boardSize: number;
  pocketRadius: number;
  walls: Matter.Body[];
  pockets: Matter.Body[];
}

export const drawCarromBoard = ({
  ctx,
  boardOffset,
  boardSize,
  pocketRadius,
  walls,
  pockets,
}: CarromBoardProps) => {
  const { x: BOARD_OFFSET_X, y: BOARD_OFFSET_Y } = boardOffset;
  const BOARD_SIZE = boardSize;
  const POCKET_RADIUS = pocketRadius;
  const STRIKER_THRESHOLD_OFFSET = 60;

  // Draw board background
  ctx.fillStyle = "#DEB887"; // Wooden color
  ctx.fillRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_SIZE, BOARD_SIZE);

  // Draw board border
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.strokeRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_SIZE, BOARD_SIZE);

  // Draw striker threshold lines
  // Left Line
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    BOARD_OFFSET_X + 80,
    BOARD_OFFSET_Y + 130,
    1,
    BOARD_SIZE - 260
  );

  // Right Line
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    BOARD_OFFSET_X + BOARD_SIZE - 80,
    BOARD_OFFSET_Y + 130,
    1,
    BOARD_SIZE - 260
  );

  // Top Line
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    BOARD_OFFSET_X + 130,
    BOARD_OFFSET_Y + 80,
    BOARD_SIZE - 260,
    1
  );

  // Bottom Line
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    BOARD_OFFSET_X + 130,
    BOARD_OFFSET_Y + BOARD_SIZE - 80,
    BOARD_SIZE - 260,
    1
  );

  // Draw center circle
  ctx.beginPath();
  ctx.arc(
    BOARD_OFFSET_X + BOARD_SIZE / 2,
    BOARD_OFFSET_Y + BOARD_SIZE / 2,
    40,
    0,
    2 * Math.PI
  );
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw corner pockets
  pockets.forEach((pocket) => {
    ctx.beginPath();
    ctx.arc(
      pocket.position.x,
      pocket.position.y,
      POCKET_RADIUS,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "#000";
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(
      pocket.position.x,
      pocket.position.y,
      POCKET_RADIUS - 5,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "#333";
    ctx.fill();
  });

  // Draw walls (only the visible board walls, not boundary walls)
  ctx.fillStyle = "#8B4513";
  walls.slice(0, 4).forEach((wall) => {
    // Only draw first 4 walls (board walls), skip boundary walls
    const width = wall.bounds.max.x - wall.bounds.min.x;
    const height = wall.bounds.max.y - wall.bounds.min.y;

    ctx.fillRect(wall.bounds.min.x, wall.bounds.min.y, width, height);
  });
};
