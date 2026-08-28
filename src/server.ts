import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from './generated/prisma/client.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json' with { type: 'json' };
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const app = express();
const port = 3000;
const prisma = new PrismaClient({
  adapter,
});

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/movies', async (_, res) => {
  const movies = await prisma.movie.findMany({
    orderBy: {
      title: 'asc',
    },
    include: {
      genres: true,
      languages: true,
    },
  });
  res.json(movies);
});

app.post('/movies', async (req, res) => {
  const { title, genre_id, language_id, oscar_count, release_date } = req.body;

  try {
    const movieWithSameTitle = await prisma.movie.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
      },
    });

    if (movieWithSameTitle) {
      return res.status(409).send({ message: 'Este filme já está cadastrado' });
    }

    await prisma.movie.create({
      data: {
        title,
        genre_id,
        language_id,
        oscar_count,
        release_date: new Date(release_date),
      },
    });
  } catch (err) {
    res.status(500).send({ message: 'Erro interno do servidor' });
  }

  res.status(201).send();
});

app.put('/movies/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const movie = await prisma.movie.findUnique({
      where: {
        id,
      },
    });

    if (!movie) {
      return res.status(404).send({ message: 'Filme não encontrado' });
    }

    const data = { ...req.body };
    data.release_date = new Date(data.release_date);

    await prisma.movie.update({
      where: {
        id,
      },
      data: data,
    });
  } catch (err) {
    res.status(500).send({ message: 'Erro interno do servidor' });
  }

  res.status(200).send();
});

app.delete('/movies/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const movie = await prisma.movie.findUnique({
      where: {
        id,
      },
    });

    if (!movie) {
      return res.status(404).send({ message: 'Filme não encontrado' });
    }

    await prisma.movie.delete({
      where: { id },
    });
  } catch (err) {
    res.status(500).send({ message: 'Erro interno do servidor' });
  }

  res.status(200).send();
});

app.get('/movies/:genreName', async (req, res) => {
  const genreName = req.params.genreName;
  try {
    const movieFilteredByGenreName = await prisma.movie.findMany({
      include: {
        genres: true,
        languages: true,
      },
      where: {
        genres: {
          name: {
            equals: genreName,
            mode: 'insensitive',
          },
        },
      },
    });

    res.status(200).send(movieFilteredByGenreName);
  } catch (err) {
    res.status(500).send({ message: 'Erro interno do servidor' });
  }
});

app.put('/genres/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).send({ message: 'O nome do gênero é obrigatório.' });
  }

  try {
    const genre = await prisma.genre.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!genre) {
      return res.status(404).send({ message: 'Gênero não encontrado.' });
    }

    const existingGenre = await prisma.genre.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: Number(id) },
      },
    });

    if (existingGenre) {
      return res
        .status(409)
        .send({ message: 'Este nome de gênero já existe.' });
    }

    const updateGenre = await prisma.genre.update({
      where: {
        id: Number(id),
      },
      data: { name },
    });

    res.status(200).json(updateGenre);
  } catch (error) {
    res.status(500).send({
      message: 'Falha ao atualizar o gênero. Erro interno do servidor',
    });
  }
});

app.post('/genres', async (req, res) => {
  const { name } = req.body;

  try {
    const genreWithSameName = await prisma.genre.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (genreWithSameName) {
      return res
        .status(409)
        .send({ message: `O gênero ${name} já está cadastrado` });
    }

    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).send({message: "falha na requisição, gênero vazio"})
    }

    const newGenre = await prisma.genre.create({
      data: {
        name,
      },
    });
    res.status(200).json(newGenre);
  } catch (error) {
    res.status(500).send({
      message: 'Não foi possível cadastrar o gênero. Erro interno do servidor',
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
