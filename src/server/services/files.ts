import mongoose, { Types } from "mongoose";
import { Readable } from "node:stream";
import { AppError } from "@/lib/api";

const BUCKET = "uploads";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]],
]);

function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new AppError("Database not connected", 500);
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

/** Checks the declared type AND the file's magic bytes, so a renamed script can't pass as a photo. */
export function assertImage(type: string, bytes: Uint8Array): void {
  const magic = ALLOWED.get(type);
  if (!magic) throw new AppError("Only JPEG, PNG or WebP photos are allowed", 415);
  if (bytes.length > MAX_PHOTO_BYTES) throw new AppError("Photo must be 5 MB or smaller", 413);
  if (!magic.every((b, i) => bytes[i] === b)) throw new AppError("File content doesn't match its type", 415);
}

/** Stores product photos in MongoDB GridFS so no extra storage service is needed yet. */
export async function savePhoto(file: File, uploaderId: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertImage(file.type, bytes);
  const id = new Types.ObjectId();
  await new Promise<void>((resolve, reject) => {
    Readable.from(Buffer.from(bytes))
      .pipe(bucket().openUploadStreamWithId(id, `photo-${id}`, { metadata: { contentType: file.type, uploaderId } }))
      .on("finish", () => resolve())
      .on("error", reject);
  });
  return String(id);
}

export async function readPhoto(id: string): Promise<{ stream: ReadableStream; contentType: string }> {
  if (!Types.ObjectId.isValid(id)) throw new AppError("Photo not found", 404);
  const files = await bucket().find({ _id: new Types.ObjectId(id) }).toArray();
  const file = files[0];
  if (!file) throw new AppError("Photo not found", 404);
  const nodeStream = bucket().openDownloadStream(file._id);
  return {
    stream: Readable.toWeb(nodeStream) as ReadableStream,
    contentType: String((file.metadata as { contentType?: string } | undefined)?.contentType ?? "application/octet-stream"),
  };
}

/** True when every id is a stored photo. Used to stop listings pointing at missing files. */
export async function photosExist(ids: readonly string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  if (!ids.every((id) => Types.ObjectId.isValid(id))) return false;
  const found = await bucket().find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } }).toArray();
  return found.length === new Set(ids).size;
}

/** Deletes photos by id; ids that are already gone are ignored. */
export async function deletePhotos(ids: readonly string[]): Promise<void> {
  for (const id of new Set(ids)) {
    if (!Types.ObjectId.isValid(id)) continue;
    await bucket().delete(new Types.ObjectId(id)).catch(() => undefined);
  }
}
