import Matter from 'matter-js';

// Main game components
export { default as CarromGame } from './CarromGame';

// Rendering components
export { drawCarromBoard } from './CarromBoard';
export { drawCarromCoins, createCarromCoins } from './CarromCoins';
export { drawTrajectory } from './Trajectory';

// Utility functions
export {
  isOnThresholdLine,
  findStrikerAtPosition,
  calculateStrikerVelocity,
  createGameBodies,
} from './GameUtils';

// Types
export interface CoinObj {
  body: Matter.Body;
  type: 'white' | 'black' | 'queen' | 'striker';
}
