import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import {
  MODEL_NAME,
  RESPONSE_SCHEMA,
  MAX_BLOCKS,
} from "../constants/books.constants";
import { logger } from "../utils/logger";
import { Book, IdentifyBooksRequestBody } from "../types/books.types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SHARED_SECRET = process.env.APP_SHARED_SECRET;

if (!GEMINI_API_KEY) {
  logger.error("Missing GEMINI_API_KEY in .env — refusing to start.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Spatial reasoning (bounding boxes) is passed as raw JSON rather than
// pre-grouped on our end, since Gemini is better at fuzzy-matching garbled
// OCR text to real titles/authors than a geometric clustering heuristic.
function buildPrompt({
  imageWidth,
  imageHeight,
  blocks,
}: IdentifyBooksRequestBody): string {
  return `You're given OCR text blocks from a photo of a bookshelf. Each
block has raw (often garbled) text and a bounding box in pixel
coordinates, within an image of size ${imageWidth}x${imageHeight}.

Books stand vertically, so one book's title may be split across multiple
blocks, and a short author/imprint line is often printed horizontally
near the bottom of the same spine — use spatial proximity (overlapping or
adjacent x-ranges) to decide which blocks belong to the same physical
book.

OCR is frequently garbled (misread letters, merged words, missing
spaces). Use your knowledge of real book titles and authors to infer the
most likely intended title and author for each group, even if the raw
text doesn't exactly match.

If you can't confidently identify a group, omit it rather than guessing.

DATA:
${JSON.stringify({ imageWidth, imageHeight, blocks })}`;
}

export async function identifyBooks(req: Request, res: Response) {
  // Stand-in gate so casual randoms can't hit your Gemini bill while
  // testing — swap for real auth (e.g. verifying a Firebase ID token)
  // before deploying anywhere public.
  if (SHARED_SECRET && req.headers["x-app-secret"] !== SHARED_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { imageWidth, imageHeight, blocks } = req.body ?? {};

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: "blocks must be a non-empty array" });
  }
  if (blocks.length > MAX_BLOCKS) {
    return res.status(400).json({ error: "Too many blocks in one request" });
  }

  logger.info(
    { blockCount: blocks.length, imageWidth, imageHeight },
    "identifyBooks request received",
  );

  try {
    const geminiStart = Date.now();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: buildPrompt({
        imageWidth,
        imageHeight,
        blocks,
      } as Required<IdentifyBooksRequestBody>),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    logger.info(
      { durationMs: Date.now() - geminiStart },
      "Gemini call completed",
    );

    // responseSchema constrains Gemini's output, but doesn't guarantee
    // well-formed JSON, so we still guard the parse.
    let books: Book[];
    try {
      books = JSON.parse(response.text ?? "");
    } catch (err) {
      logger.error(
        { responseText: response.text },
        "Failed to parse Gemini response as JSON",
      );
      return res.status(502).json({ error: "Gemini returned malformed JSON" });
    }

    if (!Array.isArray(books)) {
      logger.error({ books }, "Gemini response was not an array");
      return res
        .status(502)
        .json({ error: "Gemini response was not an array" });
    }

    logger.info({ bookCount: books.length }, "identifyBooks succeeded");
    res.json({ books });
  } catch (err) {
    logger.error({ err }, "Gemini call failed");
    res.status(502).json({ error: "Failed to reach Gemini API" });
  }
}
