import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./Home.css"; // Import the CSS

const socket = io("http://localhost:9898", {
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function Home() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null); // Track error state

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      return;
    }
    // Get anonymous JWT
    fetch("http://localhost:9898/api/auth/anon", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setToken(data.token);
        localStorage.setItem("token", data.token);
      })
      .catch(() => {
        setError("Failed to authenticate anonymously.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("http://localhost:9898/api/poll")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch polls");
        return res.json();
      })
      .then((data) => {
        setPolls(data);
        setLoading(false);

        if (data.length > 0) {
          data.forEach((poll) => {
            socket.emit("subscribe", poll.id);
          });
        }
      })
      .catch((err) => {
        console.error("Error fetching polls:", err.message);
        setError("Error fetching polls. Please try again later.");
        setLoading(false);
      });

    socket.on("poll-update", (update) => {
      console.log(update)
      setPolls((prevPolls) =>
        prevPolls.map((poll) =>
          poll.id == update.pollId
            ? { ...poll, options: update.options }
            : poll
        )
      );
    });

    // Cleanup on unmount
    // return () => {
    //   socket.off("poll-update");
    // };
  }, []);

  const vote = async (pollId, optionId) => {
    try {
      const response = await fetch(
        `http://localhost:9898/api/poll/${pollId}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ optionId }),
        }
      );
      if (!response.ok) {
        alert("Failed to vote: " + response.statusText);
      }
    } catch (err) {
      alert("An error occurred while voting.");
    }
  };

  if (loading) return <p>Loading polls...</p>;

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  if (polls.length === 0)
    return <p>No polls available at the moment.</p>;

  return (
    <div className="home-container">
      <h1>Live Polls</h1>
      {polls.map((poll) => {
        const totalVotes = poll.options.reduce(
          (acc, o) => acc + o.votes,
          0
        );
        return (
          <div key={poll.id} className="poll-card">
            <h2>{poll.question}</h2>
            <p>
              <strong>Expires at:</strong>{" "}
              {new Date(poll.expireAt).toLocaleString()}
            </p>
            {poll.options.map((option) => {
              const votePercentage = totalVotes
                ? Math.round((option.votes / totalVotes) * 100)
                : 0;
              return (
                <div
                  key={option.id}
                  className="poll-option"
                  onClick={() => vote(poll.id, option.id)}
                >
                  <div className="option-label">
                    <span>{option.option_text}</span>
                    <span>{votePercentage}%</span>
                  </div>
                  <div className="option-bar">
                    <div
                      className="option-fill"
                      style={{ width: `${votePercentage}%` }}
                    >
                      {option.votes}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default Home;
