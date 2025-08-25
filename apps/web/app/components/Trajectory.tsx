import Matter from "matter-js";

export interface TrajectoryProps {
  ctx: CanvasRenderingContext2D;
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragCurrent: { x: number; y: number } | null;
  selectedStriker: Matter.Body | null;
}

export const drawTrajectory = ({
  ctx,
  isDragging,
  dragStart,
  dragCurrent,
  selectedStriker,
}: TrajectoryProps) => {
  // Draw trajectory when aiming
  if (
    isDragging &&
    dragStart &&
    dragCurrent &&
    selectedStriker &&
    selectedStriker.position
  ) {
    const dx = (dragCurrent.x - dragStart.x) * 6;
    const dy = (dragCurrent.y - dragStart.y) * 6;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      // Only show if dragged significantly
      // Draw trajectory line
      ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(selectedStriker.position.x, selectedStriker.position.y);

      // Calculate trajectory direction (opposite to drag)
      const trajectoryLength = Math.min(distance * 3, 200);
      const trajectoryX =
        selectedStriker.position.x - (dx / distance) * trajectoryLength;
      const trajectoryY =
        selectedStriker.position.y - (dy / distance) * trajectoryLength;

      ctx.lineTo(trajectoryX, trajectoryY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Draw power indicator
      const powerMultiplier = distance / 30;
      const power = Math.min(powerMultiplier, 30) / 30; // Normalize to 0-1
      ctx.fillStyle = `rgba(255, ${255 - Math.floor(power * 255)}, 0, 0.8)`;
      ctx.fillRect(10, 10, 200 * power, 20);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 200, 20);

      // Power text
      ctx.fillStyle = "#000";
      ctx.font = "14px Arial";
      ctx.fillText(`Power: ${Math.floor(power * 100)}%`, 220, 25);
    }
  }
};
