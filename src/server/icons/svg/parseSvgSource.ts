import { DOMParser, XMLSerializer, type Element } from '@xmldom/xmldom';
import { createIssue } from '@/server/icons/svg/svgIssue';
import { SVG_NAMESPACE, XLINK_NAMESPACE } from '@/server/icons/svg/svgMarkup';
import { SVG_ISSUE_CODE } from '@/shared/constants/icons';
import type { SvgIssue } from '@/shared/types/icons';

const ELEMENT_NODE = 1;
const WRAPPER_TAG = 'lib-icons-source';
const PROLOGUE_PATTERNS = [/<\?xml[\s\S]*?\?>/gi, /<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi];

interface NodeListLike<TNode> {
  readonly length: number;
  item(index: number): TNode | null;
}

interface ParserMessage {
  isFatal: boolean;
  isWarning: boolean;
  text: string;
  line: number | null;
}

export interface ParsedCandidate {
  element: Element;
  sourceId: string | null;
  line: number | null;
  sourceSvg: string;
  issues: SvgIssue[];
}

export interface ParsedSource {
  candidates: ParsedCandidate[];
  issues: SvgIssue[];
}

export function toArray<TNode>(list: NodeListLike<TNode>): TNode[] {
  const items: TNode[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const node = list.item(index);
    if (node) items.push(node);
  }
  return items;
}

export function childElements(element: Element): Element[] {
  return toArray(element.childNodes).filter((node) => node.nodeType === ELEMENT_NODE) as Element[];
}

function lineOf(element: Element): number | null {
  const { lineNumber } = element as { lineNumber?: number };
  return typeof lineNumber === 'number' ? lineNumber : null;
}

// Xoá khai báo XML và DOCTYPE (chặn entity/XXE) nhưng giữ nguyên số dòng để báo lỗi đúng vị trí.
function stripPrologue(source: string): string {
  return PROLOGUE_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, (match) => match.replace(/[^\n]/g, '')),
    source,
  );
}

function readLocatorLine(context: unknown): number | null {
  if (typeof context !== 'object' || context === null || !('locator' in context)) return null;
  const { locator } = context;
  if (typeof locator !== 'object' || locator === null || !('lineNumber' in locator)) return null;
  return typeof locator.lineNumber === 'number' ? locator.lineNumber : null;
}

function toParserMessage(level: string, message: string, line: number | null): ParserMessage {
  const text = (message.split('\n')[0] ?? message).replace(/^\[xmldom [^\]]*\]\s*/i, '').trim();
  return {
    isFatal: level === 'fatalError',
    isWarning: level.startsWith('warn'),
    text,
    line,
  };
}

function toIssue(message: ParserMessage): SvgIssue {
  const code = message.isWarning ? SVG_ISSUE_CODE.parseWarning : SVG_ISSUE_CODE.parseError;
  return createIssue(code, message.text || 'Invalid SVG markup', message.line === null ? {} : { line: message.line });
}

function findCandidateElements(root: Element): Element[] {
  const symbols = toArray(root.getElementsByTagNameNS(SVG_NAMESPACE, 'symbol'));
  if (symbols.length > 0) return symbols;
  return childElements(root).filter(
    (element) => element.namespaceURI === SVG_NAMESPACE && element.localName === 'svg',
  );
}

function findOwner(candidates: ParsedCandidate[], line: number | null): ParsedCandidate | null {
  if (line === null) return null;
  let owner: ParsedCandidate | null = null;
  for (const candidate of candidates) {
    if (candidate.line !== null && candidate.line <= line) owner = candidate;
  }
  return owner;
}

export function parseSvgSource(source: string): ParsedSource {
  const messages: ParserMessage[] = [];
  const parser = new DOMParser({
    onError: (level: string, message: string, context: unknown) => {
      messages.push(toParserMessage(level, message, readLocatorLine(context)));
    },
  });
  const wrapped = `<${WRAPPER_TAG} xmlns="${SVG_NAMESPACE}" xmlns:xlink="${XLINK_NAMESPACE}">${stripPrologue(source)}</${WRAPPER_TAG}>`;

  let root: Element | null = null;
  try {
    root = parser.parseFromString(wrapped, 'image/svg+xml').documentElement;
  } catch (error) {
    if (!messages.some((message) => message.isFatal)) {
      const text = error instanceof Error ? error.message : String(error);
      messages.push(toParserMessage('fatalError', text, readLocatorLine(error)));
    }
  }

  const fatal = messages.find((message) => message.isFatal);
  if (fatal || !root) {
    return { candidates: [], issues: [toIssue(fatal ?? toParserMessage('fatalError', 'Invalid SVG markup', null))] };
  }

  const serializer = new XMLSerializer();
  const candidates: ParsedCandidate[] = findCandidateElements(root).map((element) => ({
    element,
    sourceId: element.getAttribute('id') || null,
    line: lineOf(element),
    sourceSvg: serializer.serializeToString(element),
    issues: [],
  }));

  const sourceIssues: SvgIssue[] = [];
  for (const message of messages) {
    const owner = findOwner(candidates, message.line);
    (owner ? owner.issues : sourceIssues).push(toIssue(message));
  }

  return { candidates, issues: sourceIssues };
}
