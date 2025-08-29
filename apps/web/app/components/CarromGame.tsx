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
  const setCoinsRef = useRef(false);

  // Host/Client role management
  const [isHost, setIsHost] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const isHostRef = useRef(true);
  const physicsUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Turn management
  const [currentHostId, setCurrentHostId] = useState<string | null>(null);
  const [playersList, setPlayersList] = useState<string[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const turnEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track pocketed coins during current turn
  const pocketedCoinsThisTurnRef = useRef<string[]>([]);
  const strikerPocketedRef = useRef<boolean>(false);

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
        console.log("All coins stopped - turn ended");
        console.log("Coins pocketed this turn:", pocketedCoinsThisTurnRef.current);
        console.log("Striker pocketed:", strikerPocketedRef.current);
        
        if (isHostRef.current) {
          // Determine if turn should switch based on carrom rules
          const shouldSwitchTurn = 
            pocketedCoinsThisTurnRef.current.length === 0 || // No coins pocketed
            strikerPocketedRef.current; // Striker was pocketed (foul)
          
          console.log("Should switch turn?", shouldSwitchTurn);
          
          if (shouldSwitchTurn) {
            console.log("HOST ending turn and switching roles");
            // Clear any existing timeout
            if (turnEndTimeoutRef.current) {
              clearTimeout(turnEndTimeoutRef.current);
            }

            // Add a small delay to ensure physics have fully settled
            turnEndTimeoutRef.current = setTimeout(() => {
              console.log("Emitting endTurn event to server");
              socket?.emit("endTurn");
            }, 500);
          } else {
            console.log("HOST continues turn (pocketed coin without foul)");
            // Reset striker position but don't switch host
            setTimeout(() => {
              updateStrikerPosition(50);
              setStrikerPosition(50);
            }, 500);
          }
          
          // Reset turn tracking
          pocketedCoinsThisTurnRef.current = [];
          strikerPocketedRef.current = false;
        } else {
          console.log("CLIENT detected coins stopped - waiting for HOST");
        }
      },
      onCoinPocketed: (coinType) => {
        console.log("Coin pocketed:", coinType);
        
        if (coinType === "striker") {
          strikerPocketedRef.current = true;
        } else {
          pocketedCoinsThisTurnRef.current.push(coinType);
          addPoints(coinType);
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

    // Current HOST always plays from bottom, CLIENT always plays from top
    console.log("Striker positioning - isHost:", isHostRef.current);

    if (isHostRef.current) {
      // HOST plays from bottom
      newPos = getStrikerPositionOnLine(
        position / 100, // Convert to 0-1 range
        "bottom",
        BOARD_OFFSET_X,
        BOARD_OFFSET_Y,
        BOARD_SIZE
      );
      console.log("HOST: Positioning striker at bottom");
    } else {
      // CLIENT plays from top
      newPos = getStrikerPositionOnLine(
        position / 100, // Convert to 0-1 range
        "top",
        BOARD_OFFSET_X,
        BOARD_OFFSET_Y,
        BOARD_SIZE
      );
      console.log("CLIENT: Positioning striker at top");
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
  };

  // Physics update functions for authoritative server
  const startPhysicsUpdates = () => {
    if (physicsUpdateIntervalRef.current) {
      clearInterval(physicsUpdateIntervalRef.current);
    }

    // Send physics updates every 50ms (20 FPS)
    physicsUpdateIntervalRef.current = setInterval(() => {
      if (!socket || !isHostRef.current) return;

      // Collect all coin positions and velocities
      const physicsData = coinsRef.current.map((coin) => ({
        id: (coin.body as any).coinId,
        type: coin.type,
        position: { x: coin.body.position.x, y: coin.body.position.y },
        velocity: { x: coin.body.velocity.x, y: coin.body.velocity.y },
        angle: coin.body.angle,
        angularVelocity: coin.body.angularVelocity,
      }));

      socket.emit("physicsUpdate", { coins: physicsData });
    }, 50);
  };

  const stopPhysicsUpdates = () => {
    if (physicsUpdateIntervalRef.current) {
      clearInterval(physicsUpdateIntervalRef.current);
      physicsUpdateIntervalRef.current = null;
    }
  };

  const applyPhysicsUpdate = (data: any) => {
    if (isHostRef.current) return; // Host doesn't apply external updates

    // Transform coordinates for opponent perspective
    const BOARD_SIZE = 500;
    const BOARD_OFFSET_X = (800 - BOARD_SIZE) / 2;
    const BOARD_OFFSET_Y = 50;
    const boardCenterX = BOARD_OFFSET_X + BOARD_SIZE / 2;
    const boardCenterY = BOARD_OFFSET_Y + BOARD_SIZE / 2;

    data.coins.forEach((coinData: any) => {
      // Match coins by unique ID instead of just type
      const localCoin = coinsRef.current.find(
        (c) => (c.body as any).coinId === coinData.id
      );
      if (localCoin) {
        // Transform position and velocity for opponent perspective
        const transformedPos = {
          x: 2 * boardCenterX - coinData.position.x,
          y: 2 * boardCenterY - coinData.position.y,
        };

        const transformedVel = {
          x: -coinData.velocity.x,
          y: -coinData.velocity.y,
        };

        // Apply the transformed physics state
        Matter.Body.setPosition(localCoin.body, transformedPos);
        Matter.Body.setVelocity(localCoin.body, transformedVel);
        Matter.Body.setAngle(localCoin.body, coinData.angle);
        Matter.Body.setAngularVelocity(
          localCoin.body,
          coinData.angularVelocity
        );
      }
    });
  };

  useEffect(() => {
    socket = io("http://localhost:8080");

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    // Handle role assignment (only for initial connection)
    socket.on("assignRole", (data: any) => {
      console.log("=== INITIAL ROLE ASSIGNMENT ===");
      console.log("Assigned role:", data.role);

      const hostRole = data.role === "host";

      setIsHost(hostRole);
      isHostRef.current = hostRole;
      setIsMyTurn(hostRole);

      updateStrikerPosition(50); // Reset striker to center on role assignment

      if (hostRole) {
        console.log("Starting as initial HOST - starting physics");
        startPhysicsUpdates();
      } else {
        console.log("Starting as initial CLIENT - no physics");
      }

      console.log("=== END INITIAL ROLE ASSIGNMENT ===");
    });

    // Handle player count updates
    socket.on("playerCount", (data: any) => {
      setPlayerCount(data.count);
      console.log("Player count:", data.count);
    });

    // Handle turn info updates
    socket.on("turnInfo", (data: any) => {
      setCurrentHostId(data.currentHost);
      setPlayersList(data.playersList);
      const amITheHost = socket.id === data.currentHost;
      const wasHost = isHostRef.current;

      console.log("=== TURN INFO ===");
      console.log("My Socket ID:", socket.id);
      console.log("Current Host ID:", data.currentHost);
      console.log("Was host:", wasHost, "-> Am I the host now?", amITheHost);

      // Reset turn tracking for new turn
      pocketedCoinsThisTurnRef.current = [];
      strikerPocketedRef.current = false;
      console.log("Reset turn tracking for new turn");

      // Update role states
      setIsHost(amITheHost);
      isHostRef.current = amITheHost;
      setIsMyTurn(amITheHost);

      // Handle physics transition
      if (wasHost && !amITheHost) {
        console.log("🔄 Lost HOST role - stopping physics");
        stopPhysicsUpdates();
      } else if (!wasHost && amITheHost) {
        console.log("⚡ Gained HOST role - starting physics");
        setTimeout(() => {
          startPhysicsUpdates();
        }, 200);
      }

      // Reset striker position to center and place it on correct side
      setStrikerPosition(50);

      // Small delay to ensure role state is updated
      setTimeout(() => {
        updateStrikerPosition(50);
      }, 100);

      console.log("=== END TURN INFO ===");
    });

    // Handle physics updates (clients only)
    socket.on("physicsUpdate", (data: any) => {
      if (!isHostRef.current) {
        applyPhysicsUpdate(data);
      }
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

      // Mirror coins only once when first receiving opponent's move
      if (!setCoinsRef.current) {
        setCoinsRef.current = true;
        // Need to wait for game objects to be ready
        setTimeout(() => {
          if ((window as any).mirrorCoinsPosition) {
            (window as any).mirrorCoinsPosition();
            console.log("Coins mirrored for opponent view");
          }
        }, 100);
      }

      setStrikerPosition(data.position);
    });

    socket.on("strikerShot", (data: any) => {
      console.log("Received striker shot:", data);

      // Find the opponent's striker (mirrored position)
      const striker = coinsRef.current.find((coin) => coin.type === "striker");
      if (striker) {
        // Apply the received velocity to opponent's striker
        Matter.Body.setVelocity(striker.body, data.velocity);
        console.log("Applied velocity to opponent striker:", data.velocity);
      }
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

    // Add unique IDs to each coin for physics sync
    coinsRef.current.forEach((coin, index) => {
      (coin.body as any).coinId = `${coin.type}-${index}`;
    });

    // Function to mirror all coin positions for opponent view
    const mirrorCoinsPosition = () => {
      const BOARD_SIZE = 500;
      const BOARD_OFFSET_X = (canvas.width - BOARD_SIZE) / 2;
      const BOARD_OFFSET_Y = 50;
      const boardCenterX = BOARD_OFFSET_X + BOARD_SIZE / 2;
      const boardCenterY = BOARD_OFFSET_Y + BOARD_SIZE / 2;

      console.log("Mirroring coins...");
      coinsRef.current.forEach((coin) => {
        if (coin.type !== "striker") {
          // Don't mirror striker as it's handled separately
          const currentPos = coin.body.position;
          const mirroredPos = {
            x: 2 * boardCenterX - currentPos.x,
            y: 2 * boardCenterY - currentPos.y,
          };
          console.log(
            `Mirroring ${coin.type} from`,
            currentPos,
            "to",
            mirroredPos
          );
          Matter.Body.setPosition(coin.body, mirroredPos);
        }
      });
    };

    // Store mirror function reference for socket handler
    (window as any).mirrorCoinsPosition = mirrorCoinsPosition;

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
      // Only HOST runs physics simulation
      if (isHostRef.current) {
        Matter.Engine.update(engine);

        // Check if all coins have stopped moving
        if (coinsRef.current.length > 0) {
          checkAllStopped(coinsRef.current);
        }
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
      // Stop physics updates
      stopPhysicsUpdates();
      // Clean up turn timeout
      if (turnEndTimeoutRef.current) {
        clearTimeout(turnEndTimeoutRef.current);
      }
      // Clean up global function reference
      delete (window as any).mirrorCoinsPosition;
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
    // Only current HOST can interact with the game, and only during their turn
    if (!isHostRef.current || !isMyTurn) return;

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

    // Calculate velocity for shooting
    const velocity = calculateStrikerVelocity(dx, dy, distance);

    // Emit striker shot data to other player
    if (socket && (velocity.x !== 0 || velocity.y !== 0)) {
      socket.emit("strikerShot", {
        velocity: {
          x: -velocity.x, // Invert for opponent perspective
          y: -velocity.y, // Invert for opponent perspective
        },
        strikerPosition: {
          x: selectedStriker.position.x,
          y: selectedStriker.position.y,
        },
      });
    }

    // Make striker dynamic again
    Matter.Body.setStatic(selectedStriker, false);

    // Apply velocity for shooting
    if (velocity.x !== 0 || velocity.y !== 0) {
      // Reset turn tracking when shot is taken
      pocketedCoinsThisTurnRef.current = [];
      strikerPocketedRef.current = false;
      console.log("Shot taken - reset turn tracking");
      
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

        {/* Host/Client Status */}
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="text-sm font-semibold">
            Role:{" "}
            <span className={isHost ? "text-green-600" : "text-blue-600"}>
              {isHost ? "HOST" : "CLIENT"}
            </span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Players: {playerCount}
          </div>
          {isHost && (
            <div className="text-xs text-green-600 mt-1">
              Running authoritative physics
            </div>
          )}
        </div>

        {/* Turn Status */}
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold">
            Turn:{" "}
            <span className={isMyTurn ? "text-green-600" : "text-orange-600"}>
              {isMyTurn ? "Your Turn" : "Opponent's Turn"}
            </span>
          </div>
          {currentHostId && (
            <div className="text-xs text-gray-600 mt-1">
              Current HOST: {currentHostId === socket?.id ? "You" : "Opponent"}
            </div>
          )}
        </div>
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
                  pointerEvents: !isHost || isDragging ? "none" : "auto",
                }}
                disabled={!isHost || isDragging}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarromGame;
