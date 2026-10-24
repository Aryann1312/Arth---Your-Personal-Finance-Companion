/**
 * @file GoldProviderInterface.js
 * @description Standard interface specification for external Gold & FX Data Providers.
 * All providers (Live API, WGC Historical Ingest, Fallback Cache) adhere to this contract.
 */

export class GoldProviderInterface {
  /**
   * Fetches latest live or latest settled market price
   * @returns {Promise<{
   *   price24kPerGram: number,
   *   price22kPerGram: number,
   *   price24kPer10g: number,
   *   price22kPer10g: number,
   *   currency: string,
   *   basis: 'observed' | 'derived',
   *   sourceName: string,
   *   sourceUrl: string,
   *   updatedAt: Date,
   *   usdInrRate?: number
   * }>}
   */
  async fetchLivePrice() {
    throw new Error('fetchLivePrice() must be implemented by concrete provider');
  }

  /**
   * Fetches historical daily records for a given date range
   * @param {Object} options
   * @param {string} options.startDate - 'YYYY-MM-DD'
   * @param {string} options.endDate - 'YYYY-MM-DD'
   * @param {('24K'|'22K'|'18K')} [options.purity='24K']
   * @param {('gram'|'10g')} [options.unit='gram']
   * @param {('INR'|'USD')} [options.currency='INR']
   * @returns {Promise<Array<{
   *   observationDate: string,
   *   price: number,
   *   currency: string,
   *   unit: string,
   *   purity: string,
   *   basis: 'observed' | 'derived',
   *   sourceName: string,
   *   sourceUrl: string,
   *   usdInrSource?: string,
   *   retrievalTimestamp: Date
   * }>>}
   */
  async fetchHistoricalDaily(options) {
    throw new Error('fetchHistoricalDaily() must be implemented by concrete provider');
  }

  /**
   * Returns provider metadata, licensing notes, and coverage limits
   * @returns {Object}
   */
  getProviderMetadata() {
    throw new Error('getProviderMetadata() must be implemented by concrete provider');
  }
}
