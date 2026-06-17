# shelf-snap-gemini-wrapper

A thin Express/TypeScript API that wraps the Gemini API to identify books from OCR'd photos of a bookshelf. The client sends OCR text blocks (with bounding boxes) from a shelf photo, and Gemini groups them into individual books, inferring the most likely title/author even when the OCR text is garbled.

## How it works

1. Client OCRs a bookshelf photo and posts the resulting text blocks (with pixel bounding boxes) to `POST /identify-books`.
2. The server builds a prompt describing the image dimensions and blocks, and asks Gemini to group blocks into books and infer title/author for each group.
3. Gemini's response is constrained to a JSON array via `responseSchema` and returned to the client as `{ books: [{ title, author }, ...] }`.

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

| Variable            | Required | Description                                                                 |
| ------------------- | -------- | ----------------------------------------------------------------------------- |
| `GEMINI_API_KEY`    | yes      | API key for the Gemini API. The server refuses to start without it.           |
| `APP_SHARED_SECRET` | no       | If set, requests must send a matching `x-app-secret` header.                  |
| `PORT`              | no       | Port to listen on (default `3000`).                                           |
| `LOG_LEVEL`         | no       | Pino log level (default `info`).                                              |
| `NODE_ENV`          | no       | Set to `production` to log structured JSON instead of pretty-printed output.  |

## Running

```bash
npm run dev    # ts-node, no build step
npm run build  # compile to dist/
npm start      # run the compiled output
```

## API

### `POST /identify-books`

**Headers** (if `APP_SHARED_SECRET` is set): `x-app-secret: <secret>`

**Body**

```json
{
  "imageWidth": 1080,
  "imageHeight": 1920,
  "blocks": [
    { "text": "THE GREAT GATSBY", "x": 10, "y": 20, "width": 100, "height": 30 }
  ]
}
```

Each block must have a `text` field; any other fields (e.g. bounding box coordinates) are passed through as-is to Gemini (see `OcrBlock` in [types/books.types.ts](types/books.types.ts)). `blocks` must be non-empty and capped at `MAX_BLOCKS` (see [constants/books.constants.ts](constants/books.constants.ts)).

**Response**

```json
{ "books": [{ "title": "The Great Gatsby", "author": "F. Scott Fitzgerald" }] }
```

On failure: `{ "error": "..." }` with a `400`, `401`, or `502` status.

## Notes

- `APP_SHARED_SECRET` is a stand-in gate to keep casual requests off your Gemini bill during development — swap it for real auth (e.g. a Firebase ID token check) before deploying publicly.
- Requests and Gemini call timing are logged via [pino](https://github.com/pinojs/pino) (see [utils/logger.ts](utils/logger.ts)); HTTP request/response logging is wired up in [server.ts](server.ts) via `pino-http`.
