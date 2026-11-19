export const maxIntimationDrafts = 20;

export type AssistantBuyer = { id: number; name: string };
export type IntimationDraft = {
 buyer_id: number;
 brand: string;
 buyer_style: string;
 sample_type: string;
 buyer_required_date: string;
 description: string;
 size: string;
 colour: string;
 quantity: number;
};

const numbers = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const fieldName = /buyer styles?|sample type|required date|description|quantity|required|colou?r|styles?|pieces|buyer|brand|type|size|due/;
const fieldPattern = new RegExp(`^\\s*(${fieldName.source})(?:\\s*[:=]\\s*|\\s+)(.+?)\\s*$`, 'i');
const inlineField = new RegExp(`,(?=\\s*(?:${fieldName.source})\\s*[:=])`, 'i');
const createIntent = /^(?:please\s+)?(?:create|add|make|prepare|draft|crte)\s+(?:(\d+|[a-z]+)\s+)?(?:(\S+)\s+)?intimations?\b\s*(.*)$/i;

export function assistantTerms(value: string) {
 return value.toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function erpPageRequest(prompt: string) {
 const request = assistantTerms(prompt);
 return request.match(/^(?:please )?(?:open|show|go to|view) (?:the )?(.+?)(?: (?:page|section|dashboard))?$/)?.[1] ?? '';
}

export function wantsIntimationReport(prompt: string) {
 return /^(?:please )?(?:download|export) (?:the )?(?:pending (?:indent|intimation|intimations)(?: report)?|intimation report)(?: (?:excel|xlsx))?$/.test(assistantTerms(prompt));
}

function matchingBuyer(name: string, buyers: AssistantBuyer[]) {
 const matches = buyers.filter(buyer => assistantTerms(buyer.name) === assistantTerms(name));
 return matches.length === 1 ? matches[0] : undefined;
}

function assistantDate(value: string, now: Date) {
 const date = value.toLowerCase();
 if (date === 'today' || date === 'tomorrow') {
  const time = new Date(now.valueOf() + (date === 'tomorrow' ? 86_400_000 : 0));
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
 }
 if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
 const indianDate = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 return indianDate ? `${indianDate[3]}-${indianDate[2].padStart(2,'0')}-${indianDate[1].padStart(2,'0')}` : '';
}

export function isIntimationRequest(prompt: string) {
 return createIntent.test(prompt.trim().split(/\r?\n/, 1)[0]);
}

export function validIntimationDate(value: string) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const time = new Date(value);
 return Number.isFinite(time.valueOf()) && time.toISOString().slice(0, 10) === value;
}

export function prepareIntimations(prompt: string, buyers: AssistantBuyer[], sampleTypes: string[], now = new Date()): IntimationDraft[] | undefined {
 const [command, ...lines] = prompt.trim().split(/\r?\n/);
 const intent = command.match(createIntent);
 if (!intent) return undefined;
 const [, amount, commandType, details] = intent;
 const typeInPlaceOfCount = !commandType && amount && sampleTypes.some(type => assistantTerms(type) === assistantTerms(amount));
 const fields = new Map<string,string>();
 // Delimit named fields with a newline or semicolon so lists can contain commas.
 for (const line of [details, ...lines].join('\n').split(/[\n;]/)) {
  for (const part of line.split(inlineField)) {
   const field = part.match(fieldPattern);
   if (field) fields.set(field[1].toLowerCase(), field[2]);
  }
 }
 const styles = (fields.get('styles') ?? fields.get('buyer styles') ?? fields.get('style') ?? fields.get('buyer style') ?? '')
  .split(',').map(value => value.trim()).filter(Boolean);
 const count = amount && !typeInPlaceOfCount && amount.toLowerCase() !== 'a' && amount.toLowerCase() !== 'an'
  ? /^\d+$/.test(amount) ? Number(amount) : numbers.indexOf(amount.toLowerCase())
  : Math.max(styles.length, 1);
 if (!Number.isInteger(count) || count < 1 || count > maxIntimationDrafts) {
  throw new Error(`Enter a number from 1 to ${maxIntimationDrafts}.`);
 }
 if (styles.length > count) throw new Error(`You listed ${styles.length} styles for ${count} intimations. Update the count or the style list.`);

 const requestedBuyer = fields.get('buyer') ?? details.match(/^for\s+(.+?)(?:[;,]|$)/i)?.[1] ?? '';
 const buyer = matchingBuyer(requestedBuyer, buyers);
 const requestedType = fields.get('sample type') ?? fields.get('type') ?? commandType ?? (typeInPlaceOfCount ? amount : '');
 const sampleType = sampleTypes.find(type => assistantTerms(type) === assistantTerms(requestedType)) ?? '';
 const requestedQuantity = fields.get('quantity') ?? fields.get('pieces') ?? '1';
 const quantity = /^\d+$/.test(requestedQuantity) ? Number(requestedQuantity) : 0;
 return Array.from({ length: count }, (_, index) => ({
  buyer_id: buyer?.id ?? 0,
  brand: fields.get('brand') ?? buyer?.name ?? '',
  buyer_style: styles[index] ?? '',
  sample_type: sampleType,
  buyer_required_date: assistantDate(fields.get('required date') ?? fields.get('required') ?? fields.get('due') ?? '', now),
  description: fields.get('description') ?? '',
  size: fields.get('size') ?? '',
  colour: fields.get('colour') ?? fields.get('color') ?? '',
  quantity
 }));
}
