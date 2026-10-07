/**
 * Meeting file seed. `e2e/fixtures/seed.ts` mirrors these values; any drift is the live smoke
 * check's business (`FACT-1033`, `FACT-3247`).
 *
 * Two files, both on `mtg-teacher-3` ("Geometry workshop"), so the read-only baseline carries
 * absolute assertions and every other seeded meeting stays the empty-state fixture (design §4).
 * `syllabus.pdf` is uploaded one minute before `notes.txt`; the listing orders `uploadedAt` DESC
 * with `id` ASC as the tiebreak (invariant 7), so `notes.txt` lists first.
 *
 * Bytes are deterministic — a fixed ASCII header padded with `0x20` to the exact seeded size —
 * never random and never `Date.now()`, so the seed is byte-identical across every `db:reset`.
 * `1024` and `48` are the literal sizes design §4 gives, chosen so `formatFileSize` renders them as
 * `1.0 KiB` and `48 B`.
 *
 * `content` is a `Uint8Array`, not a `Buffer`: `FACT-3628` converts `Uint8Array` to `Buffer` at the
 * controller boundary and nowhere else, and Prisma's own `Bytes` field is typed `Uint8Array`.
 *
 * **`SEC-API-11` fixture** — five more rows, all on `mtg-planner-2`, a meeting dedicated to this and
 * nothing else (`meetings.seed.ts`). `SEC-API-11` asserts that a stored filename can never break out
 * of the `Content-Disposition` header the download handler builds; the upload path enforces the
 * filename rule, but this seed writes `MeetingFile` rows straight through Prisma, bypassing the
 * controller entirely — exactly the door the invariant is about, and the most realistic instance of
 * the threat rather than a stand-in for it. The five filenames below are written **verbatim, with no
 * sanitisation**: a double quote, a `\r\n` followed by a forged header line, a `\n` followed by
 * another, a `../../` traversal sequence, and a non-ASCII name — none of which the filename rule
 * would ever let an upload produce. Nothing ever uploads into `mtg-planner-2`, and no case asserts
 * `planner`'s meeting or file counts, which is what keeps this fixture invisible to the rest of the
 * suite.
 */

export interface SeedMeetingFile {
  id: string;
  meetingId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  content: Uint8Array<ArrayBuffer>;
  uploadedAt: string;
}

const PDF_HEADER = '%PDF-1.7\n';
const PDF_SIZE_BYTES = 1024;

const NOTES_HEADER = 'Workshop notes: review before next session.\n';
const NOTES_SIZE_BYTES = 48;

// Content size for the `SEC-API-11` fixture rows: the hostile part is the filename, not the bytes,
// so one small, ordinary size for all five keeps the fixture uniform.
const HOSTILE_SIZE_BYTES = 32;

function buildContent(header: string, sizeBytes: number): Uint8Array<ArrayBuffer> {
  const content = new Uint8Array(sizeBytes).fill(0x20);
  const headerBytes = new TextEncoder().encode(header);

  content.set(headerBytes.subarray(0, Math.min(headerBytes.length, sizeBytes)));

  return content;
}

export const SEED_MEETING_FILES: readonly SeedMeetingFile[] = [
  {
    id: 'fil-teacher-3-1',
    meetingId: 'mtg-teacher-3',
    filename: 'syllabus.pdf',
    contentType: 'application/pdf',
    sizeBytes: PDF_SIZE_BYTES,
    content: buildContent(PDF_HEADER, PDF_SIZE_BYTES),
    uploadedAt: '2026-01-15T15:30:00.000Z',
  },
  {
    id: 'fil-teacher-3-2',
    meetingId: 'mtg-teacher-3',
    filename: 'notes.txt',
    contentType: 'text/plain',
    sizeBytes: NOTES_SIZE_BYTES,
    content: buildContent(NOTES_HEADER, NOTES_SIZE_BYTES),
    uploadedAt: '2026-01-15T15:31:00.000Z',
  },
  // `SEC-API-11` fixture — see the module comment. Verbatim, hostile filenames, on `mtg-planner-2`
  // only. Each name is written exactly as it appears here; none is sanitised, normalized or escaped.
  {
    id: 'fil-planner-2-1',
    meetingId: 'mtg-planner-2',
    filename: 'report".txt',
    contentType: 'text/plain',
    sizeBytes: HOSTILE_SIZE_BYTES,
    content: buildContent('Quote in filename.\n', HOSTILE_SIZE_BYTES),
    uploadedAt: '2026-01-20T10:05:00.000Z',
  },
  {
    id: 'fil-planner-2-2',
    meetingId: 'mtg-planner-2',
    filename: 'evidence.log\r\nX-Injected: 1',
    contentType: 'text/plain',
    sizeBytes: HOSTILE_SIZE_BYTES,
    content: buildContent('CRLF header injection.\n', HOSTILE_SIZE_BYTES),
    uploadedAt: '2026-01-20T10:06:00.000Z',
  },
  {
    id: 'fil-planner-2-3',
    meetingId: 'mtg-planner-2',
    filename: 'minutes.txt\nSet-Cookie: a=b',
    contentType: 'text/plain',
    sizeBytes: HOSTILE_SIZE_BYTES,
    content: buildContent('LF header injection.\n', HOSTILE_SIZE_BYTES),
    uploadedAt: '2026-01-20T10:07:00.000Z',
  },
  {
    id: 'fil-planner-2-4',
    meetingId: 'mtg-planner-2',
    filename: '../../etc/passwd',
    contentType: 'text/plain',
    sizeBytes: HOSTILE_SIZE_BYTES,
    content: buildContent('Path traversal attempt.\n', HOSTILE_SIZE_BYTES),
    uploadedAt: '2026-01-20T10:08:00.000Z',
  },
  {
    id: 'fil-planner-2-5',
    meetingId: 'mtg-planner-2',
    filename: 'déjà-vu.png',
    contentType: 'text/plain',
    sizeBytes: HOSTILE_SIZE_BYTES,
    content: buildContent('Non-ASCII filename.\n', HOSTILE_SIZE_BYTES),
    uploadedAt: '2026-01-20T10:09:00.000Z',
  },
];
