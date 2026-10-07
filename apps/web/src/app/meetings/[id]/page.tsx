import { Card } from '@heroui/react';
import { ArrowLeftIcon, ClockIcon, PaperclipIcon } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';

import { NavRail } from '@/components/nav-rail';
import { UploadFileForm } from '@/components/upload-file-form';
import { formatMeetingDateTime } from '@/lib/format-date';
import { formatFileSize } from '@/lib/format-file-size';
import { getMeetingById, getMeetingFiles } from '@/lib/dal';

export const metadata: Metadata = {
  title: 'Meeting — PurpleSchool',
};

interface MeetingPageProps {
  // Next 16: `params` is a `Promise`. Typed by hand rather than `PageProps<'/meetings/[id]'>`, so
  // this does not depend on how fresh `next typegen` is (the same reason `page.tsx` gives for `/`).
  params: Promise<{ id: string }>;
}

/**
 * Meeting detail page — a server component, reached by following a dashboard list row
 * (`MF-FN-01`).
 *
 * Invariant 10: `getMeetingById()` and `getMeetingFiles()` each repeat the session check and are
 * the real authorization boundary; `proxy.ts` only sees that a cookie exists. Both turn a 404 from
 * Nest into Next's `notFound()`, so a meeting owned by somebody else is indistinguishable from one
 * that does not exist (`ADR-0018`, `MF-FN-11`).
 *
 * The shell is the one `src/app/page.tsx` already uses (`ADR-0026`): nav rail, `max-w-7xl` main
 * column, `gap-8` between sections.
 *
 * Markup dictated by the cases:
 *  - exactly one `h1`, carrying the meeting title, and exactly one `main` landmark (`MF-FN-02`,
 *    `ACC-FN-04`);
 *  - the list of attachments is `ul`/`li` (never `ListBox` — `ADR-0023`), labelled "Attachments",
 *    each row a link whose accessible name is the filename (`MF-FN-03`); the size sits beside it
 *    as separate text, so it never becomes part of the link's accessible name;
 *  - the empty state is explicit text, never an empty `ul` (`MF-FN-04`);
 *  - "Back to dashboard" is a real link to `/` (`MF-FN-13`).
 *
 * The download Route Handler (task 15) is not written here. The download link already points at
 * its path — `/meetings/<id>/files/<fileId>` — so the href needs no edit once that route exists;
 * until then `MF-FN-07` stays red. The upload form (`UploadFileForm`, task 14) sits in the same
 * `<section>`, below the attachments list.
 */
export default async function MeetingPage({ params }: MeetingPageProps) {
  const { id } = await params;

  const meeting = await getMeetingById(id);
  const files = await getMeetingFiles(id);

  return (
    <div className="bg-background min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <NavRail />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="text-muted hover:text-foreground flex w-fit items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeftIcon size={20} weight="regular" aria-hidden="true" />
            Back to dashboard
          </Link>

          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{meeting.title}</h1>
            <p className="text-muted flex items-center gap-1.5 text-sm">
              <ClockIcon size={20} weight="regular" aria-hidden="true" />
              {`${formatMeetingDateTime(meeting.startsAt)} · ${String(meeting.durationMinutes)} min`}
            </p>
          </div>
        </header>

        <main className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Files</h2>

            {files.items.length === 0 ? (
              <p className="border-border text-muted rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                No attachments yet
              </p>
            ) : (
              <ul className="flex flex-col gap-3" aria-label="Attachments">
                {files.items.map((file) => (
                  <li key={file.id}>
                    <Card.Root className="rounded-2xl px-4 py-3">
                      <Card.Content className="flex flex-row items-center justify-between gap-4 p-0">
                        {/*
                          A native `<a>`, not next/link: this href is a Route Handler (task 15)
                          that streams bytes, not a page. next/link's client-side navigation would
                          fetch it as an RSC payload and misinterpret the response; a plain anchor
                          lets the browser do a normal, full download request.
                        */}
                        <a
                          href={`/meetings/${meeting.id}/files/${file.id}`}
                          className="hover:text-accent flex min-w-0 items-center gap-2 font-medium"
                        >
                          <PaperclipIcon size={20} weight="regular" aria-hidden="true" />
                          <span className="truncate">{file.filename}</span>
                        </a>

                        <span className="text-muted shrink-0 text-sm">
                          {formatFileSize(file.sizeBytes)}
                        </span>
                      </Card.Content>
                    </Card.Root>
                  </li>
                ))}
              </ul>
            )}

            <UploadFileForm meetingId={meeting.id} />
          </section>
        </main>
      </div>
    </div>
  );
}
