/**
 * Body of `POST /meetings/:id/files`, deliberately empty (design §3, the multipart `ValidationPipe`
 * fork, "C5"). The file itself arrives through `FileInterceptor`/`@UploadedFile()`, never through
 * this DTO, so no property is ever declared here.
 *
 * This works **only** because `validation.pipe.js:36` hard-codes `forbidUnknownValues: false` ahead
 * of the caller's options; class-validator's own default is `true`, under which a class with no
 * decorated properties rejects every payload. Adding `forbidUnknownValues: true` to the global pipe
 * is a plausible future hardening edit that would break this endpoint and nothing else — the global
 * pipe's options are not touched here or anywhere else in this change (invariant 3).
 *
 * `whitelist` + `forbidNonWhitelisted` then turn any text part into the `FACT-2013` 400 body,
 * measured over multipart — which is the entire point of declaring no properties: **every** text
 * part is "extra".
 */
export class UploadFileDto {}
