import prisma from "../config/prisma.js";

const createUser = async ({ first_name, last_name, email, password_hash, role }) => {
  return prisma.user.create({
    data: {
      first_name,
      last_name,
      email,
      password_hash,
      role,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });
};

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      password_hash: true,
      role: true,
      created_at: true,
    },
  });
};

const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });
};

export default {
  createUser,
  findUserByEmail,
  findUserById,
};
