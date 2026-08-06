import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const app = express();
const port = 3000;
const prisma = new PrismaClient({
  adapter,
});

app.get('/movies', async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc",
        },
        include: {
            genres: true,
            languages: true,
        }
    });
    res.json(movies);
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
