"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { drawCarromBoard } from "./CarromBoard";
import { drawCarromCoins, createCarromCoins } from "./CarromCoins";
import { drawTrajectory } from "./Trajectory";
import {
  findStrikerAtPosition,
  calculateStrikerVelocity,
  createGameBodies,
  getStrikerPositionOnLine,
} from "./GameUtils";
import { useScoreManager, ScoreDisplay } from "./game/ScoreManager";
import { useGameStateManager, CoinObj } from "./game/GameStateManager";
import { io } from "socket.io-client";

let socket: any;
let ctx: any;

const CarromGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const [gameObjects, setGameObjects] = useState({});
  const coinsRef = useRef<CoinObj[]>([]);

  // Striker positioning state
  const [strikerPosition, setStrikerPosition] = useState(50); // 0-100 percentage position
  const isRemoteUpdateRef = useRef(false); // Flag to prevent infinite socket loops
  const isOpponentPlayingRef = useRef(false);

  // Score management
  const { score, addPoints, resetScore } = useScoreManager({
    onScoreUpdate: (newScore) => {
      console.log("Score updated:", newScore);
    },
  });

  // Game state management
  const { checkAllStopped, handleCoinPocketed, resetStriker } =
    useGameStateManager({
      onAllStopped: () => {
        console.log("All coins stopped - resetting striker");
        // Reset striker position to center (50%) using our existing function
        setTimeout(() => {
          setStrikerPosition(50);
          // Force update striker position after state update
          setTimeout(() => {
            updateStrikerPosition(50);
          }, 50);
        }, 200);
      },
      onCoinPocketed: (coinType) => {
        if (coinType !== "striker") {
          const points = addPoints(coinType);
          console.log(`${coinType} coin pocketed! +${points} points`);
        } else {
          console.log("Striker pocketed - penalty");
        }
      },
    });

  // Aiming state (only for shooting, not positioning)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const selectedStrikerRef = useRef<Matter.Body | null>(null);

  // Keep React state for UI updates
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragCurrent, setDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedStriker, setSelectedStriker] = useState<Matter.Body | null>(
    null
  );

  // Ref for remote player's trajectory (use ref instead of state for canvas rendering)
  const remoteTrajectoryRef = useRef<{
    isDragging: boolean;
    dragStart: { x: number; y: number } | null;
    dragCurrent: { x: number; y: number } | null;
    selectedStriker: any;
  } | null>(null);

  // Update striker position based on slider
  const updateStrikerPosition = (position: number) => {
    // setStrikerPosition(position);

    if (!engineRef.current || coinsRef.current.length === 0) {
      console.log("Cannot update striker: engine or coins not ready");
      return;
    }

    const striker = coinsRef.current.find((coin) => coin.type === "striker");
    if (!striker) {
      console.log("Cannot find striker");
      return;
    }

    const { BOARD_OFFSET_X, BOARD_OFFSET_Y, BOARD_SIZE } = gameObjects as any;
    if (!BOARD_OFFSET_X) {
      console.log("Game objects not ready");
      return;
    }

    let newPos;

    // Calculate position on the bottom threshold line only
    if (isOpponentPlayingRef.current) {
      newPos = getStrikerPositionOnLine(
        position / 100, // Convert to 0-1 range
        "top",
        BOARD_OFFSET_X,
        BOARD_OFFSET_Y,
        BOARD_SIZE
      );
    } else {
      newPos = getStrikerPositionOnLine(
        position / 100, // Convert to 0-1 range
        "bottom",
        BOARD_OFFSET_X,
        BOARD_OFFSET_Y,
        BOARD_SIZE
      );
    }

    console.log(
      "Updating striker position to:",
      newPos,
      "slider position:",
      position
    );

    // Stop striker movement and set new position
    Matter.Body.setVelocity(striker.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(striker.body, 0);
    Matter.Body.setPosition(striker.body, { x: newPos.x, y: newPos.y });

    isOpponentPlayingRef.current = false;
  };

  useEffect(() => {
    socket = io("http://localhost:8080");

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    socket.on("drawTrajectory", (data: any) => {
      console.log("Received trajectory data:", data);
      console.log("isDragging:", data.isDragging);
      console.log(
        "Remote selectedStriker position:",
        data.selectedStriker?.position
      );

      // Transform coordinates to opponent's perspective (180 degree rotation around board center)
      const transformCoordinate = (coord: { x: number; y: number } | null) => {
        if (!coord) return null;

        // Use hardcoded board dimensions since they're constants
        const BOARD_SIZE = 500;
        const BOARD_OFFSET_X = (800 - BOARD_SIZE) / 2; // canvas width is 800
        const BOARD_OFFSET_Y = 50;

        const boardCenterX = BOARD_OFFSET_X + BOARD_SIZE / 2;
        const boardCenterY = BOARD_OFFSET_Y + BOARD_SIZE / 2;

        console.log("Original coord:", coord);
        console.log("Board center:", { x: boardCenterX, y: boardCenterY });

        // Rotate 180 degrees around board center
        const transformed = {
          x: 2 * boardCenterX - coord.x,
          y: 2 * boardCenterY - coord.y,
        };

        console.log("Transformed coord:", transformed);
        return transformed;
      };

      remoteTrajectoryRef.current = {
        isDragging: data.isDragging,
        dragStart: transformCoordinate(data.dragStart),
        dragCurrent: transformCoordinate(data.dragCurrent),
        selectedStriker: data.selectedStriker
          ? {
              position: transformCoordinate(data.selectedStriker.position),
            }
          : null,
      };
      console.log(
        "Updated remoteTrajectoryRef.current:",
        remoteTrajectoryRef.current
      );
    });

    socket.on("adjustStriker", (data: any) => {
      console.log("Received striker adjustment:", data.position);
      isRemoteUpdateRef.current = true; // Set flag to prevent emitting
      isOpponentPlayingRef.current = true;
      setStrikerPosition(data.position);
    });

    // Matter.js setup
    const engine = Matter.Engine.create();
    const world = engine.world;
    engineRef.current = engine;

    // Disable gravity (Carrom is a top-down game)
    engine.gravity.x = 0;
    engine.gravity.y = 0;

    // Configure engine for better physics
    engine.constraintIterations = 2;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;
    engine.enableSleeping = false; // Keep bodies active for better interactions

    // Board dimensions
    const BOARD_SIZE = 500;
    const BOARD_OFFSET_X = (canvas.width - BOARD_SIZE) / 2;
    const BOARD_OFFSET_Y = 50; // Position board at the top with some margin
    const COIN_RADIUS = 12;
    const STRIKER_RADIUS = 15;

    // Create game bodies
    const { walls, pockets, POCKET_RADIUS } = createGameBodies(
      BOARD_OFFSET_X,
      BOARD_OFFSET_Y,
      BOARD_SIZE
    );

    // Create carrom coins setup
    const centerX = BOARD_OFFSET_X + BOARD_SIZE / 2;
    const centerY = BOARD_OFFSET_Y + BOARD_SIZE / 2;

    // Create all coins (including queen and color coins)
    const coins = createCarromCoins(centerX, centerY, COIN_RADIUS);

    // Create striker at initial position (bottom line, center)
    const initialStrikerPos = getStrikerPositionOnLine(
      0.5, // Center position
      "bottom",
      BOARD_OFFSET_X,
      BOARD_OFFSET_Y,
      BOARD_SIZE
    );

    const striker = Matter.Bodies.circle(
      initialStrikerPos.x,
      initialStrikerPos.y,
      STRIKER_RADIUS,
      {
        restitution: 0.7,
        friction: 0.4,
        frictionAir: 0.02,
        density: 0.003,
      }
    );
    coins.push({ body: striker, type: "striker" });

    // Initialize coins tracking
    coinsRef.current = coins;

    // Get all coin bodies for adding to world
    const allCoinBodies = coins.map((coin) => coin.body);

    // Add all bodies to world
    Matter.World.add(world, [...walls, ...pockets, ...allCoinBodies]);

    // Store references for cleanup and interaction
    setGameObjects({
      walls,
      pockets,
      coins,
      BOARD_SIZE,
      BOARD_OFFSET_X,
      BOARD_OFFSET_Y,
      POCKET_RADIUS,
    });

    // Collision detection for pockets
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        // Check if a coin hit a pocket
        if (
          (pockets.includes(bodyA) && !pockets.includes(bodyB)) ||
          (pockets.includes(bodyB) && !pockets.includes(bodyA))
        ) {
          const coin = pockets.includes(bodyA) ? bodyB : bodyA;

          console.log("Coin fell into pocket!");

          // Handle scoring before removing coin
          handleCoinPocketed(coin, coinsRef.current);

          // Remove coin from world and tracking array
          setTimeout(() => {
            Matter.World.remove(world, coin);
            // Remove from coins tracking array
            coinsRef.current = coinsRef.current.filter((c) => c.body !== coin);
          }, 100);
        }
      });
    });

    // Render function
    const render = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw board
      drawCarromBoard({
        ctx,
        boardOffset: { x: BOARD_OFFSET_X, y: BOARD_OFFSET_Y },
        boardSize: BOARD_SIZE,
        pocketRadius: POCKET_RADIUS,
        walls,
        pockets,
      });

      // Draw all coins
      drawCarromCoins({ ctx, coins: coinsRef.current });

      // Draw local trajectory when aiming
      drawTrajectory({
        ctx,
        isDragging: isDraggingRef.current,
        dragStart: dragStartRef.current,
        dragCurrent: dragCurrentRef.current,
        selectedStriker: selectedStrikerRef.current,
      });

      // Draw remote player's trajectory
      if (remoteTrajectoryRef.current) {
        if (
          remoteTrajectoryRef.current.isDragging &&
          remoteTrajectoryRef.current.dragStart &&
          remoteTrajectoryRef.current.dragCurrent
        ) {
          console.log(
            "Drawing remote trajectory:",
            remoteTrajectoryRef.current
          );
          // Create a mock striker body with position for remote trajectory
          const mockStriker = {
            position: remoteTrajectoryRef.current.selectedStriker?.position || {
              x: 0,
              y: 0,
            },
          };

          drawTrajectory({
            ctx,
            isDragging: remoteTrajectoryRef.current.isDragging,
            dragStart: remoteTrajectoryRef.current.dragStart,
            dragCurrent: remoteTrajectoryRef.current.dragCurrent,
            selectedStriker: mockStriker as Matter.Body,
          });
        } else if (!remoteTrajectoryRef.current.isDragging) {
          // Clear remote trajectory when not dragging
          // console.log("Clearing remote trajectory"); // might come in handy for debugging
        }
      }

      requestAnimationFrame(render);
    };

    // Game loop
    const gameLoop = () => {
      Matter.Engine.update(engine);

      // Check if all coins have stopped moving
      if (coinsRef.current.length > 0) {
        checkAllStopped(coinsRef.current);
      }

      requestAnimationFrame(gameLoop);
    };

    // Start loops
    render();
    gameLoop();
    renderRef.current = render;

    // Cleanup
    return () => {
      Matter.Engine.clear(engine);
      // Remove any remaining global listeners
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      socket.disconnect();
    };
  }, []);

  // Update striker position when slider changes
  useEffect(() => {
    updateStrikerPosition(strikerPosition);

    // Only emit socket event if this is not a remote update
    if (!isRemoteUpdateRef.current && socket && socket.connected) {
      console.log("Emitting striker position:", strikerPosition);
      socket.emit("adjustStriker", { position: strikerPosition });
    }

    // Reset the flag after processing
    isRemoteUpdateRef.current = false;
  }, [strikerPosition, gameObjects]);

  // Mouse event handlers for aiming only
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find striker at click position
    const strikerObj = findStrikerAtPosition(x, y, coinsRef.current);

    if (strikerObj) {
      console.log("Starting aim with striker");

      // Update both state and refs
      setIsDragging(true);
      setSelectedStriker(strikerObj.body);
      setDragStart({ x, y });
      setDragCurrent({ x, y });

      isDraggingRef.current = true;
      selectedStrikerRef.current = strikerObj.body;
      dragStartRef.current = { x, y };
      dragCurrentRef.current = { x, y };

      // Make striker static during aiming
      Matter.Body.setStatic(strikerObj.body, true);

      // Add global mouse event listeners for when mouse goes outside canvas
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);

      // Emit start of trajectory drawing
      if (socket) {
        socket.emit("drawTrajectory", {
          isDragging: true,
          dragStart: { x, y },
          dragCurrent: { x, y },
          selectedStriker: {
            position: {
              x: strikerObj.body.position.x,
              y: strikerObj.body.position.y,
            },
          },
        });
      }
    }
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!isDragging || !selectedStriker) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update drag current position for trajectory
    setDragCurrent({ x, y });
    dragCurrentRef.current = { x, y };

    // Emit trajectory update
    if (socket) {
      socket.emit("drawTrajectory", {
        isDragging: true,
        dragStart: dragStartRef.current,
        dragCurrent: { x, y },
        selectedStriker: selectedStrikerRef.current
          ? {
              position: {
                x: selectedStrikerRef.current.position.x,
                y: selectedStrikerRef.current.position.y,
              },
            }
          : null,
      });
    }
  };

  const handleGlobalMouseUp = (e: MouseEvent) => {
    if (!isDragging || !selectedStriker || !dragStart || !dragCurrent) {
      // Clean up listeners even if not dragging
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      return;
    }

    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy) * 6;

    // Make striker dynamic again
    Matter.Body.setStatic(selectedStriker, false);

    // Calculate and apply velocity for shooting
    const velocity = calculateStrikerVelocity(dx, dy, distance);
    if (velocity.x !== 0 || velocity.y !== 0) {
      Matter.Body.setVelocity(selectedStriker, velocity);
    }

    // Reset states
    setIsDragging(false);
    setSelectedStriker(null);
    setDragStart(null);
    setDragCurrent(null);

    isDraggingRef.current = false;
    selectedStrikerRef.current = null;
    dragStartRef.current = null;
    dragCurrentRef.current = null;

    // Remove global listeners
    document.removeEventListener("mousemove", handleGlobalMouseMove);
    document.removeEventListener("mouseup", handleGlobalMouseUp);

    // Emit end of trajectory drawing
    if (socket) {
      console.log("Emitting trajectory end (mouse up)");
      socket.emit("drawTrajectory", {
        isDragging: false,
        dragStart: null,
        dragCurrent: null,
        selectedStriker: null,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedStriker) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update drag current position for trajectory
    setDragCurrent({ x, y });
    dragCurrentRef.current = { x, y };

    // Emit trajectory update
    if (socket) {
      socket.emit("drawTrajectory", {
        isDragging: true,
        dragStart: dragStartRef.current,
        dragCurrent: { x, y },
        selectedStriker: selectedStrikerRef.current
          ? {
              position: {
                x: selectedStrikerRef.current.position.x,
                y: selectedStrikerRef.current.position.y,
              },
            }
          : null,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleGlobalMouseUp(e.nativeEvent);
  };

  return (
    <div className="flex items-start justify-center gap-6 p-4">
      {/* Score Display - Left of the board */}
      <div className="mt-8">
        <ScoreDisplay score={score} />
      </div>

      <div className="relative border-2 border-gray-800">
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* Striker Position Control Bar - Inside board container */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80">
          <div
            className="rounded-full border-2"
            style={{
              backgroundColor: "#DEB887",
              borderColor: "#8B4513",
              padding: "4px 8px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              pointerEvents: isDragging ? "none" : "auto", // Disable when aiming
            }}
          >
            <div className="relative w-full h-8 flex items-center">
              {/* Striker knob */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full shadow-lg transition-none pointer-events-none"
                style={{
                  left: `${strikerPosition}%`,
                  background: "#FFD700",
                  border: "2px solid #B8860B",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Add highlight like the board striker */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: "3px",
                    left: "3px",
                    width: "8px",
                    height: "8px",
                    background: "rgba(255, 255, 255, 0.4)",
                  }}
                />
              </div>

              {/* Interactive range input */}
              <input
                type="range"
                min="0"
                max="100"
                value={strikerPosition}
                onChange={(e) => setStrikerPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer range-input"
                style={{
                  margin: 0,
                  padding: 0,
                  pointerEvents: isDragging ? "none" : "auto",
                }}
                disabled={isDragging}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarromGame;
