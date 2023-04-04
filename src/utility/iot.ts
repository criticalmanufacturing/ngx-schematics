export type IoTValueType =
  | 'Any'
  | 'String'
  | 'Integer'
  | 'Long'
  | 'Decimal'
  | 'Boolean'
  | 'Date'
  | 'Object'
  | 'Buffer'
  | 'Enum';

export type ValueType =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'Buffer';

/**
 * Return the JavaScript corresponding type for the IoT data type
 * @param type IoT data type to translate
 */
export function toValueType(type: IoTValueType): string {
  switch (type) {
    case 'String':
      return 'string';
    case 'Decimal':
    case 'Long':
    case 'Integer':
      return 'number';
    case 'Object':
      return 'object';
    case 'Buffer':
      return 'Buffer';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'Date';
  }

  return 'any';
}

export function toConverterType(type: IoTValueType): string {
  if (type === 'Any') {
    return 'undefined';
  }

  return 'Converter.ConverterValueType.' + type;
}
