"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarromGame from "../components/CarromGame";

export default function GamePage() {
  const [playerName, setPlayerName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get player name from session storage
    const storedName = sessionStorage.getItem("carromPlayerName");

    if (storedName) {
      setPlayerName(storedName);
    } else {
      // If no name is found, redirect to home page
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading game...
      </div>
    );
  }

  return <CarromGame playerName={playerName} />;
}
