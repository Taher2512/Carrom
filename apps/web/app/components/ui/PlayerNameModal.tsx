"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

interface PlayerNameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerNameModal = ({ isOpen, onClose }: PlayerNameModalProps) => {
  const [playerName, setPlayerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) return;

    setIsSubmitting(true);

    // Store player name in session storage for the game
    sessionStorage.setItem("carromPlayerName", playerName.trim());

    // Navigate to game page
    router.push("/game");
  };

  const handleClose = () => {
    setPlayerName("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Enter Your Name">
      <form onSubmit={handleSubmit} className="player-name-form">
        <div className="form-group">
          <label htmlFor="playerName" className="form-label">
            Player Name
          </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="form-input"
            maxLength={20}
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!playerName.trim() || isSubmitting}
          >
            {isSubmitting ? "Starting Game..." : "Start Playing"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .player-name-form {
          min-width: 300px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #2d3748;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }

        .form-input:disabled {
          background-color: #f7fafc;
          color: #a0aec0;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f7fafc;
          color: #4a5568;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        .btn-primary {
          background: #3182ce;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2c5aa0;
        }
      `}</style>
    </Modal>
  );
};
