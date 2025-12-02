"use client";

import { useState, useEffect } from "react";

export default function CreateClub({ onSubmit, initialData }) {
  const [club, setClub] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setClub(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    setClub({ ...club, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(club);
    setClub({ name: "", description: "" });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        name="name"
        placeholder="Club Name"
        value={club.name}
        onChange={handleChange}
        required
        style={styles.input}
      />

      <input
        name="description"
        placeholder="Description"
        value={club.description}
        onChange={handleChange}
        required
        style={styles.input}
      />

      
      <button type="submit" style={styles.button}>
        {initialData ? "Update Club" : "Create Club"}
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "300px",
    marginTop: "20px",
  },
  input: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "8px",
    borderRadius: "4px",
    border: "none",
    background: "black",
    color: "white",
    cursor: "pointer",
  },
};
