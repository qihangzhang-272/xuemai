const PAGE_SEPARATORS = /[\u000B\u000C\u0085]/gu;
const DISALLOWED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000E-\u001F\u007F-\u0084\u0086-\u009F]/u;
const EXTRACTABLE_CHARACTER = /[\p{L}\p{N}]/u;
const DISPLAY_ONLY_MARKUP =
  /!?\[([^\[\]\r\n]*)\]\([^()\r\n]*\)|<\/?[A-Za-z][^<>\r\n]*>|&(?:#[0-9]+|#x[0-9A-Fa-f]+|[A-Za-z]+);/gu;
const MIN_DENSE_REPLACEMENT_CHARACTERS = 2;
const MAX_REPLACEMENT_CHARACTER_RATIO = 0.02;
const MAX_MATERIAL_CHARACTERS = 40_000;

export class MaterialTextQualityError extends Error {
  constructor(
    public readonly reason: 'content' | 'encoding' = 'content',
    message = '教材正文无法识别，请检查内容后重试',
  ) {
    super(message);
    this.name = 'MaterialTextQualityError';
  }
}

export function assertMaterialTextQuality(value: string) {
  const text = value.replace(PAGE_SEPARATORS, '\n').trim();
  const replacementCharacters = countReplacementCharacters(text);
  const hasDenseReplacementCharacters =
    replacementCharacters >= MIN_DENSE_REPLACEMENT_CHARACTERS &&
    replacementCharacters / Math.max(1, text.replace(/\s/gu, '').length) >=
      MAX_REPLACEMENT_CHARACTER_RATIO;
  const extractableText = text.replace(
    DISPLAY_ONLY_MARKUP,
    (_markup, markdownLabel: string | undefined) => markdownLabel ?? '',
  );
  if (
    !text ||
    DISALLOWED_CONTROL_CHARACTERS.test(text) ||
    hasDenseReplacementCharacters ||
    !EXTRACTABLE_CHARACTER.test(extractableText)
  ) {
    throw new MaterialTextQualityError();
  }
  return text;
}

export function assertMaterialTextLength(value: string) {
  if (value.length > MAX_MATERIAL_CHARACTERS) {
    throw new Error('教材正文过长，请拆分为单课节材料后再提炼');
  }
}

function countReplacementCharacters(value: string) {
  let count = 0;
  let offset = 0;
  while ((offset = value.indexOf('\uFFFD', offset)) !== -1) {
    count += 1;
    offset += 1;
  }
  return count;
}

export function decodeUtf8MaterialText(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new MaterialTextQualityError('encoding');
  }
}
