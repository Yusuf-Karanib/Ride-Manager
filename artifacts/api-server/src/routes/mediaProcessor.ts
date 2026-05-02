/**
 * Media processing route — SKELETON.
 *
 * Endpoint: POST /api/media
 *
 * Accepts a multipart file upload (single field name: `file`) of either an
 * audio or image MIME type.
 *
 *   - Audio  → transcribed via OpenAI Whisper (or AssemblyAI fallback),
 *              then the resulting transcript is piped into the moderation
 *              engine in `./engine` (engine.js / engine.ts).
 *   - Image  → forwarded directly into the moderation engine for vision-
 *              based moderation. (Stub today, OCR / vision call goes here.)
 *
 * The route returns the raw transcript (for audio) and the engine's verdict.
 *
 * NOTE: This is a skeleton. To make it run you must:
 *   1. Add multer to artifacts/api-server: `pnpm --filter @workspace/api-server add multer @types/multer`
 *   2. Implement (or generate) `artifacts/api-server/src/routes/engine.ts`
 *      exporting `moderateText(text)` and `moderateImage(buffer, mime)`.
 *   3. Set OPENAI_API_KEY (or ASSEMBLYAI_API_KEY) via the environment-secrets
 *      flow — never commit keys.
 *   4. Register this router in `src/app.ts`:
 *        `app.use('/api/media', mediaProcessorRouter);`
 */

import { Router, type Request, type Response } from "express";
// import multer from "multer"; // TODO: install — see header.
// import { moderateText, moderateImage } from "./engine.js"; // TODO: implement.

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper's hard limit.

const ACCEPTED_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
]);

const ACCEPTED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type Provider = "openai" | "assemblyai";
const TRANSCRIPTION_PROVIDER: Provider =
  (process.env.TRANSCRIPTION_PROVIDER as Provider) || "openai";

// ---------------------------------------------------------------------------
// Multer wiring (commented until dependency is installed)
// ---------------------------------------------------------------------------

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
// });

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

async function transcribeWithOpenAI(file: UploadedFile): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
    file.originalname,
  );
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Whisper transcription failed (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}

async function transcribeWithAssemblyAI(file: UploadedFile): Promise<string> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not set");

  // 1) Upload raw bytes.
  const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: key,
      "content-type": "application/octet-stream",
    },
    body: new Uint8Array(file.buffer),
  });
  if (!uploadRes.ok) {
    throw new Error(`AssemblyAI upload failed (${uploadRes.status})`);
  }
  const { upload_url } = (await uploadRes.json()) as { upload_url: string };

  // 2) Kick off transcription.
  const startRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: key,
      "content-type": "application/json",
    },
    body: JSON.stringify({ audio_url: upload_url }),
  });
  if (!startRes.ok) {
    throw new Error(`AssemblyAI start failed (${startRes.status})`);
  }
  const { id } = (await startRes.json()) as { id: string };

  // 3) Poll until complete. (Skeleton — production should use webhooks.)
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      { headers: { authorization: key } },
    );
    if (!pollRes.ok) continue;
    const poll = (await pollRes.json()) as {
      status: "queued" | "processing" | "completed" | "error";
      text?: string;
      error?: string;
    };
    if (poll.status === "completed") return poll.text ?? "";
    if (poll.status === "error") {
      throw new Error(`AssemblyAI transcription error: ${poll.error}`);
    }
  }
  throw new Error("AssemblyAI transcription timed out");
}

async function transcribe(file: UploadedFile): Promise<string> {
  if (TRANSCRIPTION_PROVIDER === "assemblyai") {
    return transcribeWithAssemblyAI(file);
  }
  return transcribeWithOpenAI(file);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

router.post(
  "/",
  // upload.single("file"), // TODO: enable once multer is installed.
  async (req: Request, res: Response) => {
    // While multer is not installed, fail loud rather than pretending to work.
    const file = (req as Request & { file?: UploadedFile }).file;
    if (!file) {
      res.status(400).json({
        error: "No file uploaded. Expected multipart field 'file'.",
        hint: "Install multer and uncomment the upload middleware.",
      });
      return;
    }

    const mime = file.mimetype.toLowerCase();
    const isAudio = ACCEPTED_AUDIO_MIME.has(mime);
    const isImage = ACCEPTED_IMAGE_MIME.has(mime);

    if (!isAudio && !isImage) {
      res.status(415).json({
        error: `Unsupported media type: ${mime}`,
        accepted: {
          audio: [...ACCEPTED_AUDIO_MIME],
          image: [...ACCEPTED_IMAGE_MIME],
        },
      });
      return;
    }

    if (file.buffer.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({
        error: `File exceeds ${MAX_UPLOAD_BYTES} byte limit.`,
      });
      return;
    }

    try {
      if (isAudio) {
        const transcript = await transcribe(file);
        // Pipe the transcribed text into the engine.js moderation pipeline.
        // const verdict = await moderateText(transcript, {
        //   source: "audio_transcription",
        //   filename: file.originalname,
        //   provider: TRANSCRIPTION_PROVIDER,
        // });
        const verdict = {
          status: "stub" as const,
          note: "engine.moderateText not yet wired",
        };

        res.json({
          kind: "audio",
          provider: TRANSCRIPTION_PROVIDER,
          transcript,
          verdict,
        });
        return;
      }

      // Image branch — hand the raw buffer to the engine for vision moderation.
      // const verdict = await moderateImage(file.buffer, mime);
      const verdict = {
        status: "stub" as const,
        note: "engine.moderateImage not yet wired",
      };

      res.json({
        kind: "image",
        mime,
        bytes: file.buffer.length,
        verdict,
      });
    } catch (err) {
      req.log?.error(
        { err, mime, name: file.originalname },
        "media processing failed",
      );
      res.status(500).json({
        error: err instanceof Error ? err.message : "Media processing failed.",
      });
    }
  },
);

export default router;
