import pool from "../config/db.js";

const createEvent = async ({
  title,
  description,
  category,
  location,
  event_date,
  capacity,
  price,
  organizer_id
}) => {
  const query = `
    INSERT INTO events (title, description, category, location, event_date, capacity, price, organizer_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    title,
    description,
    category,
    location,
    event_date,
    capacity,
    price,
    organizer_id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllEvents = async () => {
  const query = `
    SELECT 
      e.*,
      u.first_name,
      u.last_name,
      u.email AS organizer_email
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    ORDER BY e.event_date ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getEventById = async (id) => {
  const query = `
    SELECT 
      e.*,
      u.first_name,
      u.last_name,
      u.email AS organizer_email
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE e.id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateEvent = async (
  id,
  {
    title,
    description,
    category,
    location,
    event_date,
    capacity,
    price
  }
) => {
  const query = `
    UPDATE events
    SET
      title = $1,
      description = $2,
      category = $3,
      location = $4,
      event_date = $5,
      capacity = $6,
      price = $7
    WHERE id = $8
    RETURNING *
  `;

  const values = [
    title,
    description,
    category,
    location,
    event_date,
    capacity,
    price,
    id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteEvent = async (id) => {
  const query = `
    DELETE FROM events
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent
};