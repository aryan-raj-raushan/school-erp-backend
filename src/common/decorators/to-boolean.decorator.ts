import { Transform } from 'class-transformer';

// Reads the raw query value: enableImplicitConversion turns the string 'false' into true
// before a plain @Transform's `value` is seen.
export const ToBoolean = () =>
  Transform(({ obj, key }) => {
    const raw = obj[key];
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return raw;
  });
