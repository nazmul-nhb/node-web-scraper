/**
 * @param {number} time
 * @returns {Promise<void>}
 */
export function delay(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}
