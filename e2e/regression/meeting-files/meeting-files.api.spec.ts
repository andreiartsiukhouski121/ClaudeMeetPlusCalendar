import type { APIRequestContext } from '@playwright/test';

import { authHeaders, authHeadersFor, loginApi } from '../../api/auth.api.js';
import type { Tracker } from '../../api/cleanup.api.js';
import {
  buildMultipartBody,
  FILE_NOT_FOUND_BODY,
  type MultipartField,
} from '../../api/meeting-files.api.js';
import { MEETING_NOT_FOUND_BODY, type ErrorBody } from '../../api/meetings.api.js';
import {
  EMPTY_FILES_MEETING_TITLE,
  FUTURE_STARTS_AT_ISO,
  GEOMETRY_WORKSHOP_TITLE,
  TEACHER_MEETING_FILES,
} from '../../fixtures/seed.js';
import { expect, test } from '../../fixtures/suite.js';

/**
 * Contract of `POST /meetings/:id/files`, `GET /meetings/:id/files`,
 * `GET /meetings/:id/files/:fileId/content` and `DELETE /meetings/:id/files/:fileId`. Cases live in the paired
 * `meeting-files.api.cases.md`; every test title starts with its case ID.
 *
 * Project `api`: the `request` fixture, `baseURL = http://127.0.0.1:3101`, no browser.
 *
 * `teacher` and `student` are read-only; mutating cases run as `planner` (`FACT-3783`), each against
 * a meeting it creates for itself and registers with its `cleanup` tracker as it is created
 * (`FACT-3780`) — the ten-file cap (`MF-API-15`) alone consumes ten slots, so a shared meeting
 * would make later cases fail for a reason that has nothing to do with what they test.
 *
 * Several cases are written against what the multipart parser does to a request before any of our
 * own code runs, rather than against what was sent: `busboy` applies `basename()` to the filename,
 * treats an empty `filename` parameter as an absent one, prefers a percent-decoded RFC 5987
 * `filename*` over `filename`, and initialises a part's content type to the literal `text/plain`,
 * overwriting it only when the header is present and parses; `multer` passes those through and
 * discards a part whose filename is falsy. Where that matters, the case and this file say so.
 */

interface MeetingFileDto {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface FilesListBody {
  items?: MeetingFileDto[];
}

interface MeetingListItem {
  id: string;
  title: string;
}

interface MeetingsPageBody {
  items?: MeetingListItem[];
}

const UNAUTHORIZED = 'Authentication required';
const MEETING_NOT_FOUND = 'Meeting not found';
const FILE_NOT_FOUND = 'File not found';
const ONE_MIB = 1_048_576;

/** `MeetingFileDto` keys per the contract, sorted — no `content` or `meetingId` among them. */
const FILE_KEYS = ['contentType', 'filename', 'id', 'sizeBytes', 'uploadedAt'];

const FILE_ID_PATTERN = /^fil-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const FILENAME_RULE_MESSAGE =
  'filename must be 1 to 100 characters of letters, digits, dot, underscore, hyphen or space';

/**
 * The created meeting's title is always unique, or a list-membership check could match a meeting
 * from a concurrently running file mutating the same owner (`fullyParallel: true`).
 */
function uniqueTitle(prefix: string): string {
  return `${prefix} ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
}

/**
 * Creates a meeting as the owner of `token`, registers it with `cleanup` before returning, and
 * returns its id, so a case cannot create one and forget it. `tolerated` is the one 404 body the
 * cleanup accepts for a case that deletes the meeting itself; `null` demands a 204.
 */
async function createMeeting(
  request: APIRequestContext,
  token: string,
  titlePrefix: string,
  cleanup: Tracker,
  tolerated: ErrorBody | null = null,
): Promise<string> {
  const response = await request.post('/meetings', {
    headers: authHeaders(token),
    data: { title: uniqueTitle(titlePrefix), startsAt: FUTURE_STARTS_AT_ISO },
  });

  expect(response.status(), 'creating the sandbox meeting for this case must succeed').toBe(201);

  const body = (await response.json()) as { id: string };
  cleanup.track(`/meetings/${body.id}`, token, tolerated);
  return body.id;
}

/** One real meeting id belonging to `teacher`, found by its seeded title — never a literal. */
async function meetingIdByTitle(
  request: APIRequestContext,
  headers: Record<string, string>,
  title: string,
): Promise<string> {
  const response = await request.get('/meetings?limit=100', { headers });

  expect(response.status(), 'reading the seeded meetings list must succeed').toBe(200);

  const body = (await response.json()) as MeetingsPageBody;
  const match = (body.items ?? []).find((item) => item.title === title);

  expect(match, `Seed must carry a meeting titled "${title}"`).toBeDefined();

  return (match as MeetingListItem).id;
}

// --- Raw multipart/form-data construction -----------------------------------------------------
//
// `buildMultipartBody` lives in `e2e/api/meeting-files.api.ts`, shared with `security.api.spec.ts`'s
// `SEC-API-07`: several cases here need a part with no `Content-Type` header at all (MF-API-14's
// absent-header variant) or an explicit empty value, a file part under any field name (MF-API-12),
// a plain text part riding alongside it (MF-API-11), or a percent-encoded `filename*` parameter
// (MF-API-10's encoded-name variants) — none of which Playwright's own `multipart` option can
// express.

const MULTIPART_BOUNDARY = 'e2eMeetingFilesBoundary7f3c9a2d';

async function uploadFile(
  request: APIRequestContext,
  headers: Record<string, string>,
  meetingId: string,
  fields: MultipartField[],
) {
  return request.post(`/meetings/${meetingId}/files`, {
    headers: { ...headers, 'content-type': `multipart/form-data; boundary=${MULTIPART_BOUNDARY}` },
    data: buildMultipartBody(fields, MULTIPART_BOUNDARY),
  });
}

/** A legal `file` part: a short `text/plain` body under a legal filename, unless overridden. */
function legalFilePart(overrides: Partial<MultipartField> = {}): MultipartField {
  return {
    name: 'file',
    filename: 'upload.txt',
    contentType: 'text/plain',
    content: 'legal upload content',
    ...overrides,
  };
}

/** Uploads one legal file and returns its DTO; the 201 is asserted here, not left to the case. */
async function uploadLegalFile(
  request: APIRequestContext,
  headers: Record<string, string>,
  meetingId: string,
  filename: string,
  content: string,
): Promise<MeetingFileDto> {
  const response = await uploadFile(request, headers, meetingId, [
    legalFilePart({ filename, content }),
  ]);

  expect(response.status(), `seeding "${filename}" must succeed`).toBe(201);

  return (await response.json()) as MeetingFileDto;
}

async function readFilesListing(
  request: APIRequestContext,
  headers: Record<string, string>,
  meetingId: string,
): Promise<{ status: number; body: FilesListBody }> {
  const response = await request.get(`/meetings/${meetingId}/files`, { headers });

  return { status: response.status(), body: (await response.json()) as FilesListBody };
}

test.describe(
  'Meeting files: API contract',
  { tag: ['@regression', '@meeting-files', '@api'] },
  () => {
    test.describe('as teacher/student (read-only)', () => {
      test(
        'MF-API-02 — all three file routes without a token give 401',
        { tag: '@p0' },
        async ({ request, cleanup }) => {
          try {
            const teacherHeaders = await authHeadersFor(request, 'teacher');
            const meetingId = await meetingIdByTitle(
              request,
              teacherHeaders,
              GEOMETRY_WORKSHOP_TITLE,
            );
            // The guard answers before any lookup, so the exact file id is immaterial to this case —
            // derived rather than fetched, since the listing route this would otherwise come from is
            // exactly what is under test.
            const fileId = `${meetingId}-file-placeholder`;

            const noAuthVariants: { label: string; headers: Record<string, string> }[] = [
              { label: 'no Authorization header', headers: {} },
              {
                label: 'Authorization: Bearer with no value',
                headers: { Authorization: 'Bearer' },
              },
            ];

            for (const variant of noAuthVariants) {
              const upload = await uploadFile(request, variant.headers, meetingId, [
                legalFilePart(),
              ]);
              const listing = await request.get(`/meetings/${meetingId}/files`, {
                headers: variant.headers,
              });
              const download = await request.get(`/meetings/${meetingId}/files/${fileId}/content`, {
                headers: variant.headers,
              });

              const expectedBody = {
                message: UNAUTHORIZED,
                error: 'Unauthorized',
                statusCode: 401,
              };
              const routes: { label: string; response: typeof upload }[] = [
                { label: 'upload', response: upload },
                { label: 'listing', response: listing },
                { label: 'download', response: download },
              ];

              for (const route of routes) {
                expect(route.response.status(), `${variant.label}: ${route.label}`).toBe(401);
                const body = (await route.response.json()) as ErrorBody;
                expect(body, `${variant.label}: ${route.label}`).toEqual(expectedBody);
              }
            }
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        "MF-API-03 — an unknown meeting and another owner's meeting give the same 404",
        { tag: '@p0' },
        async ({ request, cleanup }) => {
          try {
            const teacherHeaders = await authHeadersFor(request, 'teacher');
            const studentHeaders = await authHeadersFor(request, 'student');
            const realMeetingId = await meetingIdByTitle(
              request,
              teacherHeaders,
              GEOMETRY_WORKSHOP_TITLE,
            );
            const derivedMeetingId = `${realMeetingId}-does-not-exist`;
            const fileId = `${realMeetingId}-file-placeholder`;

            const uploadWrongOwner = await uploadFile(request, studentHeaders, realMeetingId, [
              legalFilePart(),
            ]);
            const listWrongOwner = await request.get(`/meetings/${realMeetingId}/files`, {
              headers: studentHeaders,
            });
            const downloadWrongOwner = await request.get(
              `/meetings/${realMeetingId}/files/${fileId}/content`,
              { headers: studentHeaders },
            );
            const listMissing = await request.get(`/meetings/${derivedMeetingId}/files`, {
              headers: studentHeaders,
            });

            expect(uploadWrongOwner.status(), 'upload, wrong owner').toBe(404);
            expect(listWrongOwner.status(), 'listing, wrong owner').toBe(404);
            expect(downloadWrongOwner.status(), 'download, wrong owner').toBe(404);
            expect(listMissing.status(), 'listing, unknown meeting').toBe(404);

            const expectedBody = {
              message: MEETING_NOT_FOUND,
              error: 'Not Found',
              statusCode: 404,
            };
            const uploadWrongOwnerBody = (await uploadWrongOwner.json()) as ErrorBody;
            const downloadWrongOwnerBody = (await downloadWrongOwner.json()) as ErrorBody;
            const listMissingBody = (await listMissing.json()) as ErrorBody;
            const listWrongOwnerBody = (await listWrongOwner.json()) as ErrorBody;

            expect(uploadWrongOwnerBody).toEqual(expectedBody);
            expect(downloadWrongOwnerBody).toEqual(expectedBody);
            expect(listMissingBody).toEqual(expectedBody);
            // The one assertion `ADR-0018` exists for: the two whole parsed bodies compared directly —
            // unowned is indistinguishable from non-existent.
            expect(listWrongOwnerBody).toEqual(listMissingBody);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-04 — GET lists the seeded files as { items }, newest first, no bytes',
        { tag: '@p0' },
        async ({ request, cleanup }) => {
          try {
            const headers = await authHeadersFor(request, 'teacher');
            const meetingId = await meetingIdByTitle(request, headers, GEOMETRY_WORKSHOP_TITLE);

            const response = await request.get(`/meetings/${meetingId}/files`, { headers });

            expect(response.status()).toBe(200);
            expect(response.headers()['content-type']).toContain('application/json');

            const text = await response.text();
            // The key `content` (the raw bytes field), never the substring: `contentType` legitimately
            // contains "content" and must not trip this check.
            expect(text).not.toMatch(/"content"\s*:/);
            expect(text).not.toContain('meetingId');
            expect(text).not.toContain('%PDF');

            const body = JSON.parse(text) as FilesListBody;
            expect(Object.keys(body)).toEqual(['items']);

            const items = body.items ?? [];
            expect(items.map((item) => item.filename)).toEqual(
              TEACHER_MEETING_FILES.items.map((item) => item.filename),
            );

            for (const [index, expected] of TEACHER_MEETING_FILES.items.entries()) {
              const actual = items[index];
              expect(actual, `item at index ${String(index)}`).toBeDefined();
              expect(
                Object.keys(actual as object).sort(),
                `item at index ${String(index)}`,
              ).toEqual(FILE_KEYS);
              expect((actual as MeetingFileDto).contentType, `item at index ${String(index)}`).toBe(
                expected.contentType,
              );
              expect((actual as MeetingFileDto).sizeBytes, `item at index ${String(index)}`).toBe(
                expected.sizeBytes,
              );
            }
          } finally {
            await cleanup.run();
          }
        },
      );

      test('MF-API-05 — a meeting with no files lists an empty items, not a 404', async ({
        request,
        cleanup,
      }) => {
        try {
          const headers = await authHeadersFor(request, 'teacher');
          const meetingId = await meetingIdByTitle(request, headers, EMPTY_FILES_MEETING_TITLE);

          const { status, body } = await readFilesListing(request, headers, meetingId);

          expect(status).toBe(200);
          expect(body.items).toEqual([]);
        } finally {
          await cleanup.run();
        }
      });

      test(
        'MF-API-06 — the download carries the four documented headers',
        { tag: '@p0' },
        async ({ request, cleanup }) => {
          try {
            const headers = await authHeadersFor(request, 'teacher');
            const meetingId = await meetingIdByTitle(request, headers, GEOMETRY_WORKSHOP_TITLE);

            const listing = await readFilesListing(request, headers, meetingId);
            expect(
              listing.status,
              'the listing route must be reachable before the download can be located',
            ).toBe(200);

            const pdfItem = (listing.body.items ?? []).find(
              (item) => item.filename === 'syllabus.pdf',
            );
            expect(pdfItem, 'the seeded syllabus.pdf must be in the listing').toBeDefined();

            const response = await request.get(
              `/meetings/${meetingId}/files/${(pdfItem as MeetingFileDto).id}/content`,
              { headers },
            );

            expect(response.status()).toBe(200);

            const responseHeaders = response.headers();
            expect(responseHeaders['content-type']).toBe('application/pdf');
            expect(responseHeaders['x-content-type-options']).toBe('nosniff');

            const bodyBuffer = await response.body();
            const expectedSizeBytes = TEACHER_MEETING_FILES.items.find(
              (item) => item.filename === 'syllabus.pdf',
            )?.sizeBytes;

            expect(Number(responseHeaders['content-length'])).toBe(bodyBuffer.length);
            expect(bodyBuffer).toHaveLength(expectedSizeBytes as number);
            expect(
              bodyBuffer.subarray(0, TEACHER_MEETING_FILES.pdfHeader.length).toString('utf8'),
            ).toBe(TEACHER_MEETING_FILES.pdfHeader);

            // Last and whole: both RFC 6266 parameters, the live pairing the builder emits for every
            // stored name — `SEC-API-11`'s benign control, exercised here as the ordinary-name case.
            expect(responseHeaders['content-disposition']).toBe(
              'attachment; filename="syllabus.pdf"; filename*=UTF-8\'\'syllabus.pdf',
            );
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-16 — evaluation order: a stranger with an oversized file gets 413',
        { tag: '@p0' },
        async ({ request, cleanup }) => {
          try {
            const studentHeaders = await authHeadersFor(request, 'student');
            const teacherHeaders = await authHeadersFor(request, 'teacher');
            const meetingId = await meetingIdByTitle(
              request,
              teacherHeaders,
              GEOMETRY_WORKSHOP_TITLE,
            );

            const oversized = Buffer.alloc(ONE_MIB + 1, 0x42);
            const oversizedResponse = await uploadFile(request, studentHeaders, meetingId, [
              legalFilePart({ content: oversized }),
            ]);

            expect(oversizedResponse.status(), 'oversized upload by a stranger').toBe(413);
            const oversizedBody = (await oversizedResponse.json()) as ErrorBody;
            expect(oversizedBody).toEqual({
              message: 'File too large',
              error: 'Payload Too Large',
              statusCode: 413,
            });

            const legalResponse = await uploadFile(request, studentHeaders, meetingId, [
              legalFilePart(),
            ]);

            expect(legalResponse.status(), 'legal-sized upload by the same stranger').toBe(404);
            const legalBody = (await legalResponse.json()) as ErrorBody;
            expect(legalBody).toEqual({
              message: MEETING_NOT_FOUND,
              error: 'Not Found',
              statusCode: 404,
            });
          } finally {
            await cleanup.run();
          }
        },
      );
    });

    /**
     * Cases under `planner`. Each creates its own meeting first: a shared mutating meeting
     * does not survive `MF-API-15`'s ten-file refusal, and a meeting a case made itself starts at zero
     * files, so its listing count is exact rather than relative.
     */
    test.describe('as planner', () => {
      test(
        'MF-API-01 — POST uploads a file and returns 201 with the five DTO keys',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E upload', cleanup);
            const content = 'hello from MF-API-01';

            const response = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: 'notes-upload.txt', content }),
            ]);

            expect(response.status()).toBe(201);

            const body = (await response.json()) as MeetingFileDto;
            expect(Object.keys(body).sort()).toEqual(FILE_KEYS);
            expect(body.filename).toBe('notes-upload.txt');
            expect(body.contentType).toBe('text/plain');
            expect(body.sizeBytes).toBe(Buffer.byteLength(content));
            expect(body.uploadedAt.endsWith('Z')).toBe(true);
            expect(body.id).toMatch(FILE_ID_PATTERN);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-07 — upload → list → download round-trips the bytes unchanged',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E round-trip', cleanup);

            // A fixed pattern holding a 0x00 byte and a byte above 0x7f: a text round-trip would not
            // catch a lossy encoding (`FACT-3628`).
            const pattern = Buffer.from([0x00, 0x7f, 0x80, 0xff, 0x41, 0x00, 0xfe]);

            const uploadResponse = await uploadFile(request, headers, meetingId, [
              {
                name: 'file',
                filename: 'pattern.bin',
                contentType: 'text/plain',
                content: pattern,
              },
            ]);

            expect(uploadResponse.status()).toBe(201);
            const uploadBody = (await uploadResponse.json()) as MeetingFileDto;

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.status).toBe(200);
            expect(listing.body.items?.length, 'exactly the one file just uploaded').toBe(1);
            expect(listing.body.items?.[0]?.id).toBe(uploadBody.id);

            const download = await request.get(
              `/meetings/${meetingId}/files/${uploadBody.id}/content`,
              {
                headers,
              },
            );

            expect(download.status()).toBe(200);
            const downloadedBytes = await download.body();
            expect(downloadedBytes).toHaveLength(pattern.length);
            expect(downloadedBytes.equals(pattern)).toBe(true);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        "MF-API-08 — an unknown file id and another meeting's file id give 404",
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const firstMeetingId = await createMeeting(
              request,
              token,
              'E2E file-404 first',
              cleanup,
            );
            const secondMeetingId = await createMeeting(
              request,
              token,
              'E2E file-404 second',
              cleanup,
            );

            const uploadResponse = await uploadFile(request, headers, firstMeetingId, [
              legalFilePart(),
            ]);
            expect(uploadResponse.status(), 'seeding the first meeting with one file').toBe(201);
            const uploadBody = (await uploadResponse.json()) as MeetingFileDto;
            const realFileId = uploadBody.id;
            const derivedFileId = `${realFileId}-does-not-exist`;

            const crossMeeting = await request.get(
              `/meetings/${secondMeetingId}/files/${realFileId}/content`,
              { headers },
            );
            const unknownFile = await request.get(
              `/meetings/${firstMeetingId}/files/${derivedFileId}/content`,
              { headers },
            );

            expect(crossMeeting.status(), "the file id's own meeting, not this one").toBe(404);
            expect(unknownFile.status(), 'a derived, never-issued file id').toBe(404);

            const expectedBody = { message: FILE_NOT_FOUND, error: 'Not Found', statusCode: 404 };
            const crossMeetingBody = (await crossMeeting.json()) as ErrorBody;
            const unknownFileBody = (await unknownFile.json()) as ErrorBody;

            expect(unknownFileBody).toEqual(expectedBody);
            expect(crossMeetingBody).toEqual(unknownFileBody);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-09 — an upload with no file part gives 400',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E no file part', cleanup);

            const response = await uploadFile(request, headers, meetingId, []);

            expect(response.status()).toBe(400);
            const body = (await response.json()) as ErrorBody;
            expect(body).toEqual({
              message: ['file is required'],
              error: 'Bad Request',
              statusCode: 400,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.body.items ?? []).toEqual([]);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-10 — the filename rule: what the parser already changed, and the 400',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E filename rule', cleanup);

            const hundredCharName = 'a'.repeat(100);
            const hundredOneCharName = 'a'.repeat(101);

            // Stored exactly as sent — the rule accepts them outright.
            const acceptedAsIs = ['a', hundredCharName, 'my report_v2-final.txt'];

            for (const filename of acceptedAsIs) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({ filename }),
              ]);

              expect(response.status(), `"${filename}" must be accepted`).toBe(201);
              const body = (await response.json()) as MeetingFileDto;
              expect(body.filename, `"${filename}"`).toBe(filename);
            }

            // `busboy` applies `basename()` before any of our code runs and treats `\` exactly like `/`
            // in the same switch branch (`busboy/lib/utils.js:479-491`), so neither separator ever
            // reaches the filename rule — the request is accepted and only the stored name is cut down.
            const pathSeparated: { sent: string; stored: string }[] = [
              { sent: '../etc/passwd', stored: 'passwd' },
              { sent: 'sub/dir.txt', stored: 'dir.txt' },
              { sent: 'a\\b.txt', stored: 'b.txt' },
            ];

            for (const { sent, stored } of pathSeparated) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({ filename: sent }),
              ]);

              expect(response.status(), `"${sent}" must be accepted, basenamed by the parser`).toBe(
                201,
              );
              const body = (await response.json()) as MeetingFileDto;
              expect(body.filename, `"${sent}" must be stored as its basename`).toBe(stored);
            }

            // `.`, `..` and a trailing separator reduce to the empty string through that same function,
            // and `multer` discards a part whose filename is falsy — `MF-API-09`'s body, reached by a
            // different route.
            const reducedToEmptyByParser = ['.', '..', 'files/'];

            for (const filename of reducedToEmptyByParser) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({ filename }),
              ]);

              expect(
                response.status(),
                `"${filename}" collapses to an empty basename and is dropped`,
              ).toBe(400);
              const body = (await response.json()) as ErrorBody;
              expect(body, `"${filename}"`).toEqual({
                message: ['file is required'],
                error: 'Bad Request',
                statusCode: 400,
              });
            }

            // An empty `filename=""` is falsy before the part is ever classified as a file: `busboy`'s
            // filename check is truthy (`busboy/lib/types/multipart.js:318`), so the parameter is thrown
            // away and the part arrives as a text field named `file` — `MF-API-19`'s body, never the
            // filename rule's "empty" clause, which is unreachable over HTTP.
            const emptyFilenameResponse = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: '' }),
            ]);

            expect(
              emptyFilenameResponse.status(),
              'an empty filename parameter is discarded exactly like an absent one',
            ).toBe(400);
            const emptyFilenameBody = (await emptyFilenameResponse.json()) as ErrorBody;
            expect(emptyFilenameBody).toEqual({
              message: ['property file should not exist'],
              error: 'Bad Request',
              statusCode: 400,
            });

            // Everything else reaches the filename rule and is refused by it.
            const refusedByRule = [hundredOneCharName, ' lead.txt', 'trail.txt ', '.hidden'];

            for (const filename of refusedByRule) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({ filename }),
              ]);

              expect(response.status(), `"${filename}" must be refused`).toBe(400);
              const body = (await response.json()) as ErrorBody;
              expect(body, `"${filename}"`).toEqual({
                message: [FILENAME_RULE_MESSAGE],
                error: 'Bad Request',
                statusCode: 400,
              });
            }

            // Live branches, not precautions, sent as an encoded RFC 5987 `filename*` parameter rather
            // than a plain `filename`: `multer` decodes `%22`, `%0A` and `%0D` back into a literal quote,
            // newline and carriage return, so a `Content-Disposition` injection really can arrive in
            // `file.originalname`; and `busboy` prefers a percent-decoded `filename*` over `filename`, so
            // a non-ASCII name really can arrive too.
            const refusedEncoded: { label: string; filenameStar: string }[] = [
              { label: 'an embedded double quote', filenameStar: 'quote%22name.txt' },
              { label: 'an embedded newline', filenameStar: 'line%0Abreak.txt' },
              { label: 'an embedded carriage return', filenameStar: 'line%0Dbreak.txt' },
              { label: 'a non-ASCII name', filenameStar: 'r%C3%A9sum%C3%A9.pdf' },
            ];

            for (const { label, filenameStar } of refusedEncoded) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({ filename: undefined, filenameStar }),
              ]);

              expect(response.status(), `${label} must be refused by the filename rule`).toBe(400);
              const body = (await response.json()) as ErrorBody;
              expect(body, label).toEqual({
                message: [FILENAME_RULE_MESSAGE],
                error: 'Bad Request',
                statusCode: 400,
              });
            }
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-11 — an extra text part gives 400 property … should not exist',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E extra field', cleanup);

            const response = await uploadFile(request, headers, meetingId, [
              legalFilePart(),
              { name: 'label', content: 'anything' },
            ]);

            expect(response.status()).toBe(400);
            const body = (await response.json()) as ErrorBody;
            expect(body).toEqual({
              message: ['property label should not exist'],
              error: 'Bad Request',
              statusCode: 400,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.body.items ?? []).toEqual([]);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-12 — a file part under another field name gives a string 400',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E wrong field name', cleanup);

            const response = await uploadFile(request, headers, meetingId, [
              legalFilePart({ name: 'attachment' }),
            ]);

            expect(response.status()).toBe(400);
            const body = (await response.json()) as ErrorBody;
            expect(Array.isArray(body.message)).toBe(false);
            expect(body).toEqual({
              message: 'Unexpected field - attachment',
              error: 'Bad Request',
              statusCode: 400,
            });
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-13 — a file over 1 048 576 bytes gives 413',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E size ceiling', cleanup);

            const atLimit = Buffer.alloc(ONE_MIB, 0x41);
            const overLimit = Buffer.alloc(ONE_MIB + 1, 0x41);

            const acceptedResponse = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: 'at-limit.bin', content: atLimit }),
            ]);
            expect(acceptedResponse.status(), 'exactly 1 048 576 bytes').toBe(201);
            const acceptedBody = (await acceptedResponse.json()) as MeetingFileDto;
            expect(acceptedBody.sizeBytes).toBe(ONE_MIB);

            const refusedResponse = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: 'over-limit.bin', content: overLimit }),
            ]);
            expect(refusedResponse.status(), '1 048 577 bytes').toBe(413);
            const refusedBody = (await refusedResponse.json()) as ErrorBody;
            expect(refusedBody).toEqual({
              message: 'File too large',
              error: 'Payload Too Large',
              statusCode: 413,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.body.items?.length, 'the refused upload wrote nothing').toBe(1);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-14 — the allow-list after normalization: accepted and refused types',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(
              request,
              token,
              'E2E content-type allow-list',
              cleanup,
            );

            const accepted: { label: string; contentType?: string }[] = [
              { label: 'application/pdf', contentType: 'application/pdf' },
              { label: 'image/png', contentType: 'image/png' },
              { label: 'image/jpeg', contentType: 'image/jpeg' },
              { label: 'text/plain', contentType: 'text/plain' },
              {
                label: 'application/pdf; charset=utf-8',
                contentType: 'application/pdf; charset=utf-8',
              },
              { label: 'APPLICATION/PDF', contentType: 'APPLICATION/PDF' },
              // padded: cut at the first `;`, trimmed and lower-cased before comparison
              { label: 'padded text/plain', contentType: 'text/plain   ' },
              // "nothing was declared" never reaches our code: busboy initialises a part's content type
              // to the literal text/plain and overwrites it only when the header is present and parses,
              // so an empty and an absent header both arrive as text/plain, which is on the allow-list.
              { label: 'empty content type', contentType: '' },
              { label: 'no content type at all', contentType: undefined },
            ];

            for (const [index, variant] of accepted.entries()) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({
                  filename: `accepted-${String(index)}.dat`,
                  contentType: variant.contentType,
                }),
              ]);

              expect(response.status(), `"${variant.label}" must be accepted`).toBe(201);
            }

            const refused: { label: string; contentType?: string }[] = [
              { label: 'image/gif', contentType: 'image/gif' },
              { label: 'application/octet-stream', contentType: 'application/octet-stream' },
              { label: 'text/html', contentType: 'text/html' },
            ];

            for (const [index, variant] of refused.entries()) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({
                  filename: `refused-${String(index)}.dat`,
                  contentType: variant.contentType,
                }),
              ]);

              expect(response.status(), `"${variant.label}" must be refused`).toBe(415);
              const body = (await response.json()) as ErrorBody;
              /*
               * The message names what is accepted — the separator is a COLON, not an em dash, so that
               * this byte-exact assertion stays ASCII (`meeting-files.api.cases.md`, MF-API-14). It is
               * shown to the user verbatim; "fixing the typography" here breaks the contract.
               */
              expect(body, `"${variant.label}"`).toEqual({
                message: 'Unsupported file type: upload a PDF, PNG, JPEG or plain text file',
                error: 'Unsupported Media Type',
                statusCode: 415,
              });
            }
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-15 — the eleventh file on a meeting is refused with 400',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(request, token, 'E2E ten-file cap', cleanup);

            for (let index = 0; index < 10; index += 1) {
              const response = await uploadFile(request, headers, meetingId, [
                legalFilePart({ filename: `cap-${String(index)}.txt` }),
              ]);

              expect(response.status(), `upload #${String(index + 1)} must be accepted`).toBe(201);
            }

            const eleventh = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: 'cap-10.txt' }),
            ]);

            expect(eleventh.status()).toBe(400);
            const body = (await eleventh.json()) as ErrorBody;
            expect(body).toEqual({
              message: ['a meeting may hold at most 10 files'],
              error: 'Bad Request',
              statusCode: 400,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.body.items?.length).toBe(10);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        "MF-API-17 — the stored content type is normalized, never the client's header",
        { tag: ['@p0', '@mutating'] },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(
              request,
              token,
              'E2E content-type normalization',
              cleanup,
            );

            const uploadResponse = await uploadFile(request, headers, meetingId, [
              legalFilePart({
                filename: 'report.pdf',
                contentType: 'APPLICATION/PDF; charset=utf-8',
              }),
            ]);

            expect(uploadResponse.status()).toBe(201);
            const uploadBody = (await uploadResponse.json()) as MeetingFileDto;
            expect(uploadBody.contentType).toBe('application/pdf');

            const listing = await readFilesListing(request, headers, meetingId);
            const item = (listing.body.items ?? []).find((file) => file.id === uploadBody.id);
            expect(item, 'the uploaded file must appear in the listing').toBeDefined();
            expect((item as MeetingFileDto).contentType).toBe('application/pdf');

            const download = await request.get(
              `/meetings/${meetingId}/files/${uploadBody.id}/content`,
              {
                headers,
              },
            );

            expect(download.status()).toBe(200);
            expect(download.headers()['content-type']).toBe('application/pdf');
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-18 — no filename and application/octet-stream: file is required',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(
              request,
              token,
              'E2E no filename octet-stream',
              cleanup,
            );

            // No `filename` parameter at all: busboy treats a part with no filename as a file only for
            // this content type, and multer then discards it, so `req.file` is undefined and the
            // handler's own missing-file branch answers.
            const response = await uploadFile(request, headers, meetingId, [
              {
                name: 'file',
                contentType: 'application/octet-stream',
                content: 'legal upload content',
              },
            ]);

            expect(response.status()).toBe(400);
            const body = (await response.json()) as ErrorBody;
            expect(body).toEqual({
              message: ['file is required'],
              error: 'Bad Request',
              statusCode: 400,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.body.items ?? []).toEqual([]);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-19 — no filename and any other type: the part arrives as a field',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const meetingId = await createMeeting(
              request,
              token,
              'E2E no filename text field',
              cleanup,
            );

            // Same request, declared as text/plain instead: busboy classifies a filename-less part of
            // any other type as a text field, so it arrives in req.body.file and the empty DTO's
            // forbidNonWhitelisted rejects it — the same mechanism as MF-API-11, naming `file` instead
            // of `label`.
            const response = await uploadFile(request, headers, meetingId, [
              { name: 'file', contentType: 'text/plain', content: 'legal upload content' },
            ]);

            expect(response.status()).toBe(400);
            const body = (await response.json()) as ErrorBody;
            expect(body).toEqual({
              message: ['property file should not exist'],
              error: 'Bad Request',
              statusCode: 400,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            expect(listing.body.items ?? []).toEqual([]);
          } finally {
            await cleanup.run();
          }
        },
      );

      // The delete cases send a DELETE only to a meeting the case created, and only to files it
      // uploaded there; `student` is the foreign token and is never mutated.
      test(
        'MF-API-20 — DELETE a file answers 204 empty; that file is gone, its sibling is not',
        { tag: ['@p0', '@mutating'] },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);

            const meetingId = await createMeeting(
              request,
              token,
              'E2E delete file',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const first = await uploadLegalFile(
              request,
              headers,
              meetingId,
              'first.txt',
              'first bytes',
            );
            const second = await uploadLegalFile(
              request,
              headers,
              meetingId,
              'second.txt',
              'second bytes',
            );

            const deleted = await request.delete(`/meetings/${meetingId}/files/${first.id}`, {
              headers,
            });
            // A Nest `@Delete` defaults to 200: the status pins the `@HttpCode`.
            expect(deleted.status()).toBe(204);
            expect(await deleted.text()).toBe('');

            const listing = await readFilesListing(request, headers, meetingId);
            expect((listing.body.items ?? []).map((item) => item.id)).toEqual([second.id]);

            const firstContent = await request.get(
              `/meetings/${meetingId}/files/${first.id}/content`,
              { headers },
            );
            expect(firstContent.status()).toBe(404);
            expect((await firstContent.json()) as ErrorBody).toEqual(FILE_NOT_FOUND_BODY);

            const secondContent = await request.get(
              `/meetings/${meetingId}/files/${second.id}/content`,
              { headers },
            );
            expect(secondContent.status()).toBe(200);
            expect(await secondContent.text()).toBe('second bytes');

            const again = await request.delete(`/meetings/${meetingId}/files/${first.id}`, {
              headers,
            });
            expect(again.status(), 'a deleted file is indistinguishable from an absent one').toBe(
              404,
            );
            expect((await again.json()) as ErrorBody).toEqual(FILE_NOT_FOUND_BODY);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        "MF-API-21 — another meeting's file and an absent file id give the file-level 404",
        { tag: ['@p0', '@mutating'] },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);

            const meetingA = await createMeeting(
              request,
              token,
              'E2E file scope A',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const meetingB = await createMeeting(
              request,
              token,
              'E2E file scope B',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const fileOfA = await uploadLegalFile(
              request,
              headers,
              meetingA,
              'scoped.txt',
              'bytes of A',
            );

            const crossMeeting = await request.delete(`/meetings/${meetingB}/files/${fileOfA.id}`, {
              headers,
            });
            const absentFile = await request.delete(
              `/meetings/${meetingA}/files/${fileOfA.id}-does-not-exist`,
              { headers },
            );

            expect(crossMeeting.status(), "A's file through B").toBe(404);
            expect(absentFile.status(), 'a derived, never-issued file id').toBe(404);

            const crossBody = (await crossMeeting.json()) as ErrorBody;
            const absentBody = (await absentFile.json()) as ErrorBody;
            // Both meetings are owned, so this is the file-level 404 and never the meeting-level one.
            expect(absentBody).toEqual(FILE_NOT_FOUND_BODY);
            expect(crossBody).toEqual(absentBody);

            const listing = await readFilesListing(request, headers, meetingA);
            expect((listing.body.items ?? []).map((item) => item.id)).toEqual([fileOfA.id]);

            const content = await request.get(`/meetings/${meetingA}/files/${fileOfA.id}/content`, {
              headers,
            });
            expect(content.status()).toBe(200);
            expect(await content.text()).toBe('bytes of A');
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-22 — a foreign meeting and an absent one give the same 404, checked first',
        { tag: ['@p0', '@mutating'] },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);
            const studentHeaders = await authHeadersFor(request, 'student');

            const meetingId = await createMeeting(
              request,
              token,
              'E2E foreign file',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const file = await uploadLegalFile(
              request,
              headers,
              meetingId,
              'kept.txt',
              'kept bytes',
            );

            const foreignRealFile = await request.delete(
              `/meetings/${meetingId}/files/${file.id}`,
              {
                headers: studentHeaders,
              },
            );
            const foreignAbsentFile = await request.delete(
              `/meetings/${meetingId}/files/${file.id}-does-not-exist`,
              { headers: studentHeaders },
            );
            const absentMeeting = await request.delete(
              `/meetings/${meetingId}-does-not-exist/files/${file.id}`,
              { headers },
            );

            expect(foreignRealFile.status(), "student, owner's real file id").toBe(404);
            expect(foreignAbsentFile.status(), 'student, absent file id').toBe(404);
            expect(absentMeeting.status(), 'owner, absent meeting id').toBe(404);

            const bodies = [
              (await foreignRealFile.json()) as ErrorBody,
              (await foreignAbsentFile.json()) as ErrorBody,
              (await absentMeeting.json()) as ErrorBody,
            ];
            // Ownership is evaluated before the file: never the file-level body, whatever the file id.
            expect(bodies).toEqual([
              MEETING_NOT_FOUND_BODY,
              MEETING_NOT_FOUND_BODY,
              MEETING_NOT_FOUND_BODY,
            ]);

            const listing = await readFilesListing(request, headers, meetingId);
            expect((listing.body.items ?? []).map((item) => item.id)).toEqual([file.id]);

            const content = await request.get(`/meetings/${meetingId}/files/${file.id}/content`, {
              headers,
            });
            expect(content.status()).toBe(200);
            expect(await content.text()).toBe('kept bytes');
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-23 — DELETE a file without a token gives 401 and the file survives',
        { tag: ['@p0', '@mutating'] },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);

            const meetingId = await createMeeting(
              request,
              token,
              'E2E unauth file',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const file = await uploadLegalFile(
              request,
              headers,
              meetingId,
              'guarded.txt',
              'guarded',
            );

            const variants: { label: string; headers: Record<string, string> }[] = [
              { label: 'no Authorization header', headers: {} },
              {
                label: 'Authorization: Bearer with no value',
                headers: { Authorization: 'Bearer' },
              },
            ];

            for (const variant of variants) {
              const response = await request.delete(`/meetings/${meetingId}/files/${file.id}`, {
                headers: variant.headers,
              });

              expect(response.status(), variant.label).toBe(401);
              expect((await response.json()) as ErrorBody, variant.label).toEqual({
                message: UNAUTHORIZED,
                error: 'Unauthorized',
                statusCode: 401,
              });
            }

            const listing = await readFilesListing(request, headers, meetingId);
            expect((listing.body.items ?? []).map((item) => item.id)).toEqual([file.id]);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-24 — deleting one of ten files frees exactly one slot',
        { tag: '@mutating' },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);

            const meetingId = await createMeeting(
              request,
              token,
              'E2E slot freed',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const uploaded: MeetingFileDto[] = [];

            for (let index = 0; index < 10; index += 1) {
              uploaded.push(
                await uploadLegalFile(
                  request,
                  headers,
                  meetingId,
                  `slot-${String(index)}.txt`,
                  'x',
                ),
              );
            }

            const deletedId = uploaded[0]?.id as string;
            const deleted = await request.delete(`/meetings/${meetingId}/files/${deletedId}`, {
              headers,
            });
            expect(deleted.status()).toBe(204);

            // The cap counts what the meeting holds when the upload arrives: nine now, so one fits.
            const eleventh = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: 'slot-10.txt' }),
            ]);
            expect(eleventh.status(), 'the freed slot accepts one more file').toBe(201);

            const twelfth = await uploadFile(request, headers, meetingId, [
              legalFilePart({ filename: 'slot-11.txt' }),
            ]);
            expect(twelfth.status(), 'the cap is still live').toBe(400);
            expect((await twelfth.json()) as ErrorBody).toEqual({
              message: ['a meeting may hold at most 10 files'],
              error: 'Bad Request',
              statusCode: 400,
            });

            const listing = await readFilesListing(request, headers, meetingId);
            const ids = (listing.body.items ?? []).map((item) => item.id);
            expect(ids).toHaveLength(10);
            expect(ids).not.toContain(deletedId);
          } finally {
            await cleanup.run();
          }
        },
      );

      test(
        'MF-API-25 — deleting a meeting takes its files with it',
        { tag: ['@p0', '@mutating'] },
        async ({ request, cleanup }) => {
          try {
            const token = await loginApi(request, 'planner');
            const headers = authHeaders(token);

            const meetingId = await createMeeting(
              request,
              token,
              'E2E cascade',
              cleanup,
              MEETING_NOT_FOUND_BODY,
            );
            const first = await uploadLegalFile(request, headers, meetingId, 'one.txt', 'one');
            const second = await uploadLegalFile(request, headers, meetingId, 'two.txt', 'two');
            // Registered after the meeting, so cleanup removes files first: a broken cascade still
            // leaves no rows. Each is expected to answer the tolerated meeting-level 404.
            cleanup.track(
              `/meetings/${meetingId}/files/${first.id}`,
              token,
              MEETING_NOT_FOUND_BODY,
            );
            cleanup.track(
              `/meetings/${meetingId}/files/${second.id}`,
              token,
              MEETING_NOT_FOUND_BODY,
            );

            const deleted = await request.delete(`/meetings/${meetingId}`, { headers });
            // With the schema's cascade removed the foreign key restricts and this answers 500.
            expect(deleted.status()).toBe(204);
            expect(await deleted.text()).toBe('');

            const listing = await request.get(`/meetings/${meetingId}/files`, { headers });
            expect(listing.status()).toBe(404);
            expect((await listing.json()) as ErrorBody).toEqual(MEETING_NOT_FOUND_BODY);

            for (const file of [first, second]) {
              const content = await request.get(`/meetings/${meetingId}/files/${file.id}/content`, {
                headers,
              });
              expect(content.status(), `content of ${file.filename}`).toBe(404);
              expect((await content.json()) as ErrorBody, file.filename).toEqual(
                MEETING_NOT_FOUND_BODY,
              );
            }
          } finally {
            await cleanup.run();
          }
        },
      );
    });
  },
);
