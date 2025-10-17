import { Pipe, PipeTransform } from '@angular/core';
import { Converter } from 'cmf-core-dashboards';

/**
 * Test Converter
 *
 * Please provide a meaningful description of this converter and how to use it
 *
 * ## Example
 *
 * ```html
 * {{obj | test}}
 * ```
 */
@Converter({
  name: $localize`:@@test-lib/test#NAME:Test Converter`,
  input: [],
  output: null
})
@Pipe({
  name: 'test'
})
export class TestConverter implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    return value;
  }
}
