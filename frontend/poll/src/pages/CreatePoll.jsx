import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreatePoll.css"; // Add this import if not already

function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expireAt, setExpireAt] = useState("");
  const navigate = useNavigate();

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://localhost:9898/api/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options, expireAt }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Poll created successfully!");
      navigate("/");
    } else {
      alert(data.error || "Failed to create poll");
    }
  };

  return (
    <div className="home-container">
      <div className="poll-card">
        <h2>Create a New Poll</h2>
        <form className="poll-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question:</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Options:</label>
            {options.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                required
                className="option-input"
              />
            ))}
            <button type="button" className="add-btn" onClick={addOption}>
              + Add Option
            </button>
          </div>

          <div className="form-group">
            <label>Expires At:</label>
            <input
              type="datetime-local"
              value={expireAt}
              onChange={(e) => setExpireAt(e.target.value)}
              required
            />
          </div>

          <button className="submit-btn" type="submit">Submit Poll</button>
        </form>
      </div>
    </div>
  );
}

export default CreatePoll;
