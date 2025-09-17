import express from 'express';
import { Indexer } from '@0glabs/0g-ts-sdk';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

const INDEXER_RPC = process.env.INDEXER_RPC || 'https://indexer-storage-testnet-standard.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PORT = process.env.PORT || 3000;

if (!PRIVATE_KEY) {
  throw new Error('Private key not found in environment variables');
}

const indexer = new Indexer(INDEXER_RPC);

app.use(express.json());

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '0G Storage API',
      version: '1.0.0',
      description: 'API documentation for 0G Storage service',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/index.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /download/{rootHash}:
 *   get:
 *     summary: Download a file
 *     description: Download a file from 0G Storage using its root hash
 *     parameters:
 *       - in: path
 *         name: rootHash
 *         required: true
 *         schema:
 *           type: string
 *         description: The root hash of the file to download
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server error
 */
app.get('/download/:rootHash', async (req, res) => {
  const { rootHash } = req.params;
  const outputPath = `downloads/${rootHash}`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  try {
    const err = await indexer.download(rootHash, outputPath, true);

    if (err !== null) {
      throw new Error(`Download error: ${err}`);
    }

      res.sendFile(outputPath, { headers: { 'Content-Disposition': `attachment; filename="${rootHash}"` } }, (err) => {
          if (err) {
              console.error('Send file error:', err);
              if (!res.headersSent) {
                  res.status(500).json({ error: 'Failed to send file' });
              }
          }
      });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
