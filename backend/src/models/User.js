import pool from "../config/db.js";

const createUser = async ({ first_name, last_name, email, password_hash, role }) => {
  const query = `
    INSERT INTO users (first_name, last_name, email, password_hash, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, first_name, last_name, email, role, created_at
  `;

  const values = [first_name, last_name, email, password_hash, role];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, first_name, last_name, email, password_hash, role, created_at
    FROM users
    WHERE email = $1
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const findUserById = async (id) => {
  const query = `
    SELECT id, first_name, last_name, email, role, created_at
    FROM users
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createUser,
  findUserByEmail,
  findUserById
};