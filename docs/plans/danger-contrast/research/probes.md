# Probes — danger-contrast

Commands and the output lines the findings in `code.md`, `tests.md` and `history.md` rest on. The
contrast scripts ran from the session scratchpad
(`C:\Users\User\AppData\Local\Temp\claude\C--GIT-PurpleSchool\f097de28-2cfd-4a00-a282-3957c798d492\scratchpad\`);
they convert OKLCH → OKLab → linear sRGB (Björn Ottosson's matrices), clamp to [0,1], and apply the
WCAG 2.x relative-luminance contrast formula.

## P1 — `--danger` against white and the canvas

Inputs: `--danger` `oklch(0.6532 0.2328 25.74)` (HeroUI `variables.css:106`), canvas
`oklch(0.969 0.004 286)` (`globals.css:28`). `node contrast.mjs`:

```
danger #ff383c canvas #f4f4f7
danger/white 3.57
danger/canvas 3.26
#ff383c/#ffffff 3.57
```

## P2 — `--accent-hover` against `--snow`

Inputs: `--accent` `oklch(0.55 0.21 285)` (`globals.css:25`), `--snow` `oklch(0.9911 0 0)`
(`variables.css:14`), mixed 90/10 in OKLab per `variables.css:130`. `node hover.mjs`:

```
accent-hover #7766e8 snow #fcfcfc ratio 4.21
```

## P3 — CI logs

```
gh run view 38429549429 --log-failed | grep -E "color-contrast|3\.56|ACC-FN-03|Error:|> *[0-9]+ \|"
  ✘  119 [web] › e2e/accessibility/accessibility.functional.spec.ts:76:7 › Accessibility › ACC-FN-03 — … (1.7s)
  ✘  120 … ACC-FN-03 — … (retry #1) (2.3s)
  ✘  121 … ACC-FN-03 — … (retry #2) (1.8s)
    Error: the login error state has violations
    > 85 |     expect(await violationsOf(page), 'the login error state has violations').toEqual([]);
    +     <p class=\"text-danger text-sm\" role=\"alert\">Invalid email or password</p>
    +   Element has insufficient color contrast of 3.56 (foreground color: #ff383c, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",

gh run view 37930853945 --log | grep -E "ACC-FN-03|contrast of|flaky|passed \("
  ✘  118 … ACC-FN-03 — … (1.5s)
  ✘  119 … ACC-FN-03 — … (retry #1) (2.1s)
  ✓  120 … ACC-FN-03 — … (retry #2) (2.0s)
    +   Element has insufficient color contrast of 3.56 (foreground color: #ff383c, background color: #ffffff, …
    +   Element has insufficient color contrast of 3.56 (foreground color: #ff383c, background color: #ffffff, …
    +   Element has insufficient color contrast of 4.49 (foreground color: #fcfcfc, background color: #7360e7, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
  1 flaky
  166 passed (1.5m)

gh run view 37127168216 --log-failed | grep -E "✘|Error:|contrast of"
  ✘   94 … accessibility.functional.spec.ts:70:7 › Accessibility › ACC-FN-03 — … (1.4s)
  ✘   95 … (retry #1) (2.1s)
  ✘   96 … (retry #2) (1.8s)
    Error: the login error state has violations
    +   Element has insufficient color contrast of 3.56 (foreground color: #ff383c, background color: #ffffff, …

gh run list --limit 15   (excerpt)
  38429549429 failure 2026-10-13 f8cd6ab
  37930853945 success 2026-10-09 18583b3
  37127168216 failure 2026-10-03 2c84730
  36992192998 success 2026-10-02 829c69c
```
