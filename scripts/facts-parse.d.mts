/**
 * Types for `facts-parse.mjs`, so the Playwright meta-test can import the one corpus parser rather
 * than growing a second one (`ADR-0021`, `ADR-0022`).
 */

export type FactBlock = {
  name: string;
  from: number;
  to: number;
  target: string;
};

export type StatedFact = {
  /** Repository-relative path of the document stating it. */
  file: string;
  /** 1-indexed line of the definition. */
  line: number;
  number: number;
  /** The definition itself — what the lock hashes. */
  statement: string;
  /** The statement plus any inherited block source — what the source check reads. */
  scope: string;
};

export type RetiredFact = {
  file: string;
  line: number;
  number: number;
  /** The statement exactly as it last stood. */
  stated: string;
  status: 'retired' | 'withdrawn' | 'bad';
  rawStatus: string;
  /** The successor key, when the status is `retired`. */
  supersededBy: number | null;
  recordedIn: string;
};

export declare const FACT_BLOCKS: FactBlock[];
export declare const FACT_KEY_ANYWHERE: RegExp;
export declare const RATIONALE_OPENER: RegExp;
export declare const FACT_DEFINITION_LIST: RegExp;

export declare function hasSourceToken(text: string): boolean;
export declare function factKey(number: number): string;
export declare function statementHash(statement: string): string;
export declare function readFile(root: string, relFile: string): string;
export declare function maskedLines(text: string): string[];
export declare function blockFiles(root: string, target: string): string[];
export declare function statedFacts(root: string, target: string): StatedFact[];
export declare function allStatedFacts(root: string): StatedFact[];
export declare function parseRetiredRegister(text: string, file?: string): RetiredFact[];
export declare function allRetiredFacts(root: string): RetiredFact[];
export declare function blockOf(number: number): FactBlock | null;

export declare const LOCK_FILE: string;
export declare function buildLock(root: string): {
  version: number;
  facts: Record<
    string,
    { status: string; document: string; hash: string; supersededBy?: string; recordedIn?: string }
  >;
};
export declare function lockDifferences(root: string): string[];
