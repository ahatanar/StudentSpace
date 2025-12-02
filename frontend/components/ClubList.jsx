export default function ClubList({ clubs, onDelete, onEdit }) {
  return (
    <div style={styles.list}>
      {clubs.map((c, i) => (
        <div key={i} style={styles.card}>
          <h3>{c.name}</h3>
          <p>{c.description}</p>

          <div style={styles.actions}>
            <button onClick={() => onEdit(i)}>Edit</button>
            <button onClick={() => onDelete(i)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    border: "1px solid #ddd",
    padding: "16px",
    borderRadius: "8px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
};
