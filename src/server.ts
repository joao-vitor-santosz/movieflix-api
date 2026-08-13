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
    res.status(500).send({ message: 'Falha ao cadatrar o filme' });
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
    res.status(500).send({ message: 'Falha ao atualizar o filme' });
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
    res.status(500).send({ message: 'Não foi possível deletar o filme' });
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
    res.status(500).send({ message: 'Falha ao filtrar filmes por gênero' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
