import Matter from "matter-js";

export interface CoinObj {
  body: Matter.Body;
  type: "white" | "black" | "queen" | "striker";
}

// Check if a body is moving
export const isBodyMoving = (
  body: Matter.Body,
  threshold: number = 0.5
): boolean => {
  const velocity = body.velocity;
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  return speed > threshold;
};

// Check if all bodies in an array are stopped
export const areAllBodiesStopped = (
  bodies: Matter.Body[],
  threshold: number = 0.5
): boolean => {
  return bodies.every((body) => !isBodyMoving(body, threshold));
};

// Get the total kinetic energy of all bodies
export const getTotalKineticEnergy = (bodies: Matter.Body[]): number => {
  return bodies.reduce((total, body) => {
    const velocity = body.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    return total + 0.5 * body.mass * speed * speed;
  }, 0);
};

// Stop a body completely
export const stopBody = (body: Matter.Body): void => {
  Matter.Body.setVelocity(body, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(body, 0);
};

// Stop all bodies in an array
export const stopAllBodies = (bodies: Matter.Body[]): void => {
  bodies.forEach(stopBody);
};
