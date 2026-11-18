import type {Row} from './types';

export function intimationReference(record: Row): string {
 return record.intimation_seq ? 'INTI' + String(record.intimation_seq).padStart(3,'0') : 'SR-' + record.id;
}
