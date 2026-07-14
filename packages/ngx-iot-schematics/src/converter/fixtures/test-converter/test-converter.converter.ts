import {
  Converter,
  DI,
  Dependencies,
  TYPES,
} from '@criticalmanufacturing/connect-iot-controller-engine';

/**
 * @whatItDoes
 *
 * >>TODO: Add description
 *
 */
@Converter.Converter()
export class TestConverterConverter implements Converter.ConverterInstance<any, any> {
  @DI.Inject(TYPES.Dependencies.Logger)
  private _logger: Dependencies.Logger;

  /**
   * >>TODO: Enter description here!
   * @param value any value
   * @param parameters Transformation parameters
   */
  transform(value: any, parameters: { [key: string]: any }): any {
    // >>TODO: Add converter code
    throw new Error('>>TODO: Not implemented yet');
  }
}
