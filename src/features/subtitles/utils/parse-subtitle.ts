import { SubtitleCue, SubtitleFormat } from '@/features/subtitles/types';

type ParseResult =
  | { ok: true; format: SubtitleFormat; cues: SubtitleCue[] }
  | { ok: false; error: string };

const TIME_RE = /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3})/;

function stripBom(input: string) {
  return input.replace(/^\uFEFF/, '');
}

function normalizeNewlines(input: string) {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeTime(raw: string) {
  const t = raw.trim().replace(',', '.');
  const parts = t.split(':');
  // VTT can be MM:SS.mmm. Normalize to HH:MM:SS.mmm
  if (parts.length === 2) return `00:${parts[0].padStart(2, '0')}:${parts[1]}`;
  if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2]}`;
  return t;
}

function cleanupText(text: string) {
  // remove common subtitle tags (<c>, <i>, <b>, <u>, etc.)
  const withoutTags = text.replace(/<[^>]+>/g, '');
  // normalize whitespace but preserve newlines
  return withoutTags
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}

function parseSrt(text: string): SubtitleCue[] {
  const normalized = normalizeNewlines(stripBom(text)).trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/g);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) timeLineIdx = 1;

    const timeLine = lines[timeLineIdx]?.trim();
    if (!timeLine) continue;

    const match = timeLine.match(TIME_RE);
    if (!match) continue;

    const start = normalizeTime(match[1]);
    const end = normalizeTime(match[2]);
    const textLines = lines.slice(timeLineIdx + 1);
    const cueText = cleanupText(textLines.join('\n'));

    cues.push({
      index: cues.length + 1,
      start,
      end,
      text: cueText,
    });
  }

  return cues;
}

function parseVtt(text: string): SubtitleCue[] {
  let normalized = normalizeNewlines(stripBom(text)).trim();
  if (!normalized) return [];

  // Remove WEBVTT header line (and optional header metadata section).
  // Header metadata ends at the first blank line *before* the first cue.
  if (/^WEBVTT/i.test(normalized)) {
    normalized = normalized.replace(/^WEBVTT[^\n]*\n?/i, '');
    const headerEnd = normalized.indexOf('\n\n');
    if (headerEnd !== -1) {
      const headerChunk = normalized.slice(0, headerEnd);
      // Only strip if we haven't hit cues yet.
      if (!TIME_RE.test(headerChunk)) {
        normalized = normalized.slice(headerEnd + 2);
      }
    }
  }

  const blocks = normalized.split(/\n{2,}/g);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const rawLines = block.split('\n').map((l) => l.trimEnd());
    const lines = rawLines.filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;

    // Skip NOTE/STYLE/REGION blocks
    const first = lines[0].trim();
    if (/^(NOTE|STYLE|REGION)\b/i.test(first)) continue;

    let timeLineIdx = 0;
    if (!TIME_RE.test(lines[0]) && lines.length >= 2) {
      // cue identifier present
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx]?.trim();
    if (!timeLine) continue;

    const match = timeLine.match(TIME_RE);
    if (!match) continue;

    const start = normalizeTime(match[1]);
    const end = normalizeTime(match[2]);

    const textLines = lines.slice(timeLineIdx + 1);
    const cueText = cleanupText(textLines.join('\n'));

    cues.push({
      index: cues.length + 1,
      start,
      end,
      text: cueText,
    });
  }

  return cues;
}

function guessFormat(text: string, fileName?: string): SubtitleFormat | null {
  const name = (fileName || '').toLowerCase();
  if (name.endsWith('.vtt')) return 'vtt';
  if (name.endsWith('.srt')) return 'srt';
  if (/^\uFEFF?WEBVTT/i.test(text.trim())) return 'vtt';
  return null;
}

export function parseSubtitleFile(args: { text: string; fileName?: string }): ParseResult {
  const raw = stripBom(args.text ?? '');
  const format = guessFormat(raw, args.fileName) ?? 'srt';

  try {
    const cues = format === 'vtt' ? parseVtt(raw) : parseSrt(raw);
    if (cues.length === 0) {
      return { ok: false, error: '未解析到任何字幕条目：请确认文件是有效的 .srt 或 .vtt 格式。' };
    }
    return { ok: true, format, cues };
  } catch (e) {
    return { ok: false, error: `解析失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

