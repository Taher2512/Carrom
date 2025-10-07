"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { PlayerNameModal } from "./components/ui/PlayerNameModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartPlaying = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={styles.title}>🏆 Carrom Champion</h1>
          <p className={styles.subtitle}>
            Experience the classic Indian board game in your browser
          </p>
          <p className={styles.description}>
            Challenge your friends in this authentic carrom simulation. Master
            your aim, pocket the coins, and claim victory!
          </p>
        </div>

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎯</span>
            <span>Realistic Physics</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>👥</span>
            <span>Multiplayer Support</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🏅</span>
            <span>Score Tracking</span>
          </div>
        </div>

        {/* Call to Action */}
        <div className={styles.cta}>
          <button className={styles.playButton} onClick={handleStartPlaying}>
            🚀 Start Playing
          </button>
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Built with ❤️ for carrom enthusiasts worldwide
        </p>
      </footer>

      <PlayerNameModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
